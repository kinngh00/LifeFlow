import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import { EligibilityTestInputSchema } from "@/features/eligibility/schemas/eligibility-test-input.schema";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import { RunProgramVersionTestsSchema, type RunProgramVersionTestsInput } from "../schemas/run-program-version-tests.schema";
import type { ProgramTestRunResult, ProgramTestRunResultItem } from "../types/program-test-run.types";
import { programTestConfigurationSelect } from "./program-test-configuration.select";

function dateOnly(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

function parseExpectedOutcomes(value: Prisma.JsonValue): Map<number, "PASS" | "FAIL" | "UNKNOWN"> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new DomainError("RULE_CONFIGURATION_INVALID", "테스트 사례의 규칙 기대값 구성이 올바르지 않습니다.");
  }
  const result = new Map<number, "PASS" | "FAIL" | "UNKNOWN">();
  for (const [key, outcome] of Object.entries(value)) {
    const order = Number(key);
    if (!Number.isInteger(order) || order < 1 || !["PASS", "FAIL", "UNKNOWN"].includes(String(outcome))) {
      throw new DomainError("RULE_CONFIGURATION_INVALID", "테스트 사례의 규칙 기대값 구성이 올바르지 않습니다.");
    }
    if (result.has(order)) {
      throw new DomainError("RULE_CONFIGURATION_INVALID", "테스트 사례의 규칙 기대값이 중복되었습니다.");
    }
    result.set(order, outcome as "PASS" | "FAIL" | "UNKNOWN");
  }
  return result;
}

export async function runProgramVersionTests(
  input: RunProgramVersionTestsInput,
  database: PrismaClient = getDatabaseClient(),
): Promise<ProgramTestRunResult> {
  const parsed = parseOrThrow(RunProgramVersionTestsSchema, input);

  try {
    return await database.$transaction(
      async (transaction) => {
        const admin = await transaction.adminUser.findUnique({ where: { id: parsed.executedById }, select: { active: true } });
        if (!admin) throw new DomainError("ADMIN_NOT_FOUND", "관리자 계정을 찾을 수 없습니다.");
        if (!admin.active) throw new DomainError("ADMIN_INACTIVE", "비활성 관리자는 테스트를 실행할 수 없습니다.");

        const version = await transaction.programVersion.findUnique({
          where: { id: parsed.programVersionId },
          select: programTestConfigurationSelect,
        });
        if (!version) throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");
        if (version.publicationStatus !== "DRAFT") {
          throw new DomainError("PROGRAM_VERSION_NOT_TESTABLE", "DRAFT 버전만 테스트할 수 있습니다.");
        }
        const activeRules = version.eligibilityRules.filter(({ active }) => active);
        if (!activeRules.length || !activeRules.some(({ required }) => required)) {
          throw new DomainError("NO_ACTIVE_RULES", "활성 필수 규칙이 최소 1개 필요합니다.");
        }
        if (!version.ruleTestCases.length) throw new DomainError("NO_TEST_CASES", "실행할 테스트 사례가 없습니다.");
        if (!version.ruleTestCases.some(({ requiredForPublish }) => requiredForPublish)) {
          throw new DomainError("NO_REQUIRED_TEST_CASES", "게시 필수 테스트 사례가 없습니다.");
        }

        const configurationHash = calculateProgramConfigurationHash(version);
        const storedResults: Array<{
          testCaseId: string;
          expectedStatus: typeof version.ruleTestCases[number]["expectedOverallStatus"];
          actualStatus: typeof version.ruleTestCases[number]["expectedOverallStatus"];
          passed: boolean;
          failureDetail: string | null;
          evaluatedRuleResults: Prisma.InputJsonValue;
          dto: ProgramTestRunResultItem;
        }> = [];

        for (const testCase of version.ruleTestCases) {
          const testInput = EligibilityTestInputSchema.safeParse(testCase.inputSnapshot);
          if (!testInput.success) {
            throw new DomainError("TEST_INPUT_INVALID", "테스트 입력이 올바르지 않습니다.", { testCaseId: testCase.id });
          }
          const evaluation = evaluateProgramEligibility({
            rules: activeRules,
            input: testInput.data,
            context: {
              applicationType: version.applicationType,
              applicationStartDate: dateOnly(version.applicationStartDate),
              applicationEndDate: dateOnly(version.applicationEndDate),
              checkedAt: dateOnly(version.checkedAt)!,
            },
          });
          if (!evaluation.executable) {
            throw new DomainError("RULE_CONFIGURATION_INVALID", evaluation.executionError ?? "규칙을 실행할 수 없습니다.");
          }

          const failureReasons: string[] = [];
          if (evaluation.status !== testCase.expectedOverallStatus) {
            failureReasons.push("전체 상태가 기대값과 다릅니다.");
          }
          for (const [displayOrder, expectedOutcome] of parseExpectedOutcomes(testCase.expectedRuleOutcomes)) {
            const actual = evaluation.ruleResults.find((item) => item.displayOrder === displayOrder);
            if (!actual) failureReasons.push(`활성 규칙 ${displayOrder}번을 찾을 수 없습니다.`);
            else if (actual.outcome !== expectedOutcome) failureReasons.push(`규칙 ${displayOrder}번 결과가 기대값과 다릅니다.`);
          }
          const passed = failureReasons.length === 0;
          storedResults.push({
            testCaseId: testCase.id,
            expectedStatus: testCase.expectedOverallStatus,
            actualStatus: evaluation.status,
            passed,
            failureDetail: passed ? null : failureReasons.join(" "),
            evaluatedRuleResults: evaluation.ruleResults as unknown as Prisma.InputJsonValue,
            dto: {
              testCaseId: testCase.id,
              name: testCase.name,
              expectedStatus: testCase.expectedOverallStatus,
              actualStatus: evaluation.status,
              passed,
              failureReasons,
            },
          });
        }

        const passedCount = storedResults.filter(({ passed }) => passed).length;
        const failedCount = storedResults.length - passedCount;
        const testRun = await transaction.ruleTestRun.create({
          data: {
            programVersionId: version.id,
            executedById: parsed.executedById,
            configurationHash,
            totalCount: storedResults.length,
            passedCount,
            failedCount,
            overallPassed: failedCount === 0,
          },
        });
        await transaction.ruleTestResult.createMany({
          data: storedResults.map((stored) => ({
            testRunId: testRun.id,
            testCaseId: stored.testCaseId,
            expectedStatus: stored.expectedStatus,
            actualStatus: stored.actualStatus,
            passed: stored.passed,
            failureDetail: stored.failureDetail,
            evaluatedRuleResults: stored.evaluatedRuleResults,
          })),
        });
        await transaction.adminAuditLog.create({
          data: {
            adminUserId: parsed.executedById,
            action: "TEST_RUN",
            entityType: "ProgramVersion",
            entityId: version.id,
            changeSummary: {
              testRunId: testRun.id,
              configurationHashPrefix: configurationHash.slice(0, 12),
              totalCount: storedResults.length,
              passedCount,
              failedCount,
              overallPassed: failedCount === 0,
            },
            requestMetadata: Prisma.JsonNull,
          },
        });

        return {
          testRunId: testRun.id,
          programVersionId: version.id,
          configurationHash,
          totalCount: storedResults.length,
          passedCount,
          failedCount,
          overallPassed: failedCount === 0,
          results: storedResults.map(({ dto }) => dto),
          executedAt: testRun.executedAt.toISOString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
