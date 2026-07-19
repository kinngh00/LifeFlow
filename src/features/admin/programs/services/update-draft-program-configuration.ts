import {
  Prisma,
  type EligibilityRule,
  type PrismaClient,
  type RuleTestCase,
} from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { toDatabaseDate } from "../mappers/admin-program.mapper";
import {
  draftConfigurationResultSelect,
  toUpdatedDraftConfigurationResult,
} from "../mappers/draft-program-configuration.mapper";
import type { UpdateDraftProgramConfigurationInput } from "../schemas/update-draft-program-configuration.schema";
import type { UpdatedDraftProgramConfigurationResult } from "../types/draft-program-configuration.types";
import { parseDraftProgramConfiguration } from "../validators/draft-program-configuration.validator";

type CreateRule = (
  transaction: Prisma.TransactionClient,
  data: Prisma.EligibilityRuleUncheckedCreateInput,
) => Promise<EligibilityRule>;

type CreateTestCase = (
  transaction: Prisma.TransactionClient,
  data: Prisma.RuleTestCaseUncheckedCreateInput,
) => Promise<RuleTestCase>;

export type UpdateDraftConfigurationDependencies = {
  database?: PrismaClient;
  createRule?: CreateRule;
  createTestCase?: CreateTestCase;
};

const createRuleWithPrisma: CreateRule = (transaction, data) =>
  transaction.eligibilityRule.create({ data });
const createTestCaseWithPrisma: CreateTestCase = (transaction, data) =>
  transaction.ruleTestCase.create({ data });

export async function updateDraftProgramConfiguration(
  input: UpdateDraftProgramConfigurationInput,
  dependencies: UpdateDraftConfigurationDependencies = {},
): Promise<UpdatedDraftProgramConfigurationResult> {
  const parsed = parseDraftProgramConfiguration(input);
  const database = dependencies.database ?? getDatabaseClient();
  const createRule = dependencies.createRule ?? createRuleWithPrisma;
  const createTestCase = dependencies.createTestCase ?? createTestCaseWithPrisma;

  try {
    const result = await database.$transaction(
      async (transaction) => {
        const admin = await transaction.adminUser.findUnique({
          where: { id: parsed.updatedById },
          select: { active: true },
        });
        if (!admin) {
          throw new DomainError("ADMIN_NOT_FOUND", "관리자 계정을 찾을 수 없습니다.");
        }
        if (!admin.active) {
          throw new DomainError("ADMIN_INACTIVE", "비활성 관리자는 DRAFT 구성을 편집할 수 없습니다.");
        }

        const version = await transaction.programVersion.findUnique({
          where: { id: parsed.programVersionId },
          select: {
            publicationStatus: true,
            program: { select: { id: true } },
            ruleTestRuns: { take: 1, select: { id: true } },
          },
        });
        if (!version) {
          throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");
        }
        if (version.publicationStatus !== "DRAFT") {
          throw new DomainError("PROGRAM_VERSION_NOT_EDITABLE", "DRAFT 버전만 구성을 편집할 수 있습니다.");
        }
        if (!version.program) {
          throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도와 연결되지 않은 버전입니다.");
        }
        if (version.ruleTestRuns.length > 0) {
          throw new DomainError(
            "PROGRAM_VERSION_NOT_EDITABLE",
            "테스트 실행 이력이 있는 버전은 이력 보호를 위해 구성을 교체할 수 없습니다.",
          );
        }

        await transaction.ruleTestCase.deleteMany({ where: { programVersionId: parsed.programVersionId } });
        await transaction.eligibilityRule.deleteMany({ where: { programVersionId: parsed.programVersionId } });
        await transaction.programRegion.deleteMany({ where: { programVersionId: parsed.programVersionId } });
        await transaction.programSource.deleteMany({ where: { programVersionId: parsed.programVersionId } });

        const sourceIds: string[] = [];
        for (const source of parsed.sources) {
          const created = await transaction.programSource.create({
            data: {
              programVersionId: parsed.programVersionId,
              sourceType: source.sourceType,
              organizationName: source.organizationName,
              documentTitle: source.documentTitle,
              sourceUrl: source.sourceUrl,
              documentIdentifier: source.documentIdentifier ?? null,
              publishedAt: toDatabaseDate(source.publishedAt),
              checkedAt: toDatabaseDate(source.checkedAt)!,
              isPrimary: source.isPrimary,
              note: source.note ?? null,
            },
            select: { id: true },
          });
          sourceIds.push(created.id);
        }

        await transaction.programRegion.createMany({
          data: parsed.regions.map((region) => ({
            programVersionId: parsed.programVersionId,
            cityCode: region.cityCode,
            districtCode: region.districtCode,
            coverageType: region.coverageType,
            reviewRequired: region.reviewRequired,
            requirementNote: region.requirementNote ?? null,
          })),
        });

        for (const rule of parsed.rules) {
          await createRule(transaction, {
            programVersionId: parsed.programVersionId,
            ruleType: rule.ruleType,
            displayOrder: rule.displayOrder,
            label: rule.label,
            description: rule.description,
            expectedCondition: rule.expectedCondition as Prisma.InputJsonValue,
            required: rule.required,
            reviewRequired: rule.reviewRequired,
            missingValueBehavior: rule.missingValueBehavior,
            passMessage: rule.passMessage,
            failureMessage: rule.failureMessage,
            unknownMessage: rule.unknownMessage,
            sourceId: sourceIds[rule.sourceReference.sourceIndex]!,
            sourceLocation: rule.sourceLocation,
            active: rule.active,
          });
        }

        for (const testCase of parsed.testCases) {
          const expectedRuleOutcomes = Object.fromEntries(
            testCase.expectedRuleOutcomes.map(({ displayOrder, outcome }) => [String(displayOrder), outcome]),
          );
          await createTestCase(transaction, {
            programVersionId: parsed.programVersionId,
            name: testCase.name,
            description: testCase.description ?? null,
            inputSnapshot: testCase.inputSnapshot as Prisma.InputJsonValue,
            expectedOverallStatus: testCase.expectedOverallStatus,
            expectedRuleOutcomes,
            requiredForPublish: testCase.requiredForPublish,
            createdById: parsed.updatedById,
          });
        }

        await transaction.adminAuditLog.create({
          data: {
            adminUserId: parsed.updatedById,
            action: "UPDATE",
            entityType: "ProgramVersion",
            entityId: parsed.programVersionId,
            changeSummary: {
              sourceCount: parsed.sources.length,
              regionCount: parsed.regions.length,
              ruleCount: parsed.rules.length,
              testCaseCount: parsed.testCases.length,
              configurationChanged: true,
            },
            requestMetadata: Prisma.JsonNull,
          },
        });

        await transaction.programVersion.update({
          where: { id: parsed.programVersionId },
          data: { updatedAt: new Date() },
        });

        return transaction.programVersion.findUniqueOrThrow({
          where: { id: parsed.programVersionId },
          select: draftConfigurationResultSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return toUpdatedDraftConfigurationResult(result);
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
