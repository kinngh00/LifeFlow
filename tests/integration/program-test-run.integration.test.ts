import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProgramVersionPublicationReadiness } from "@/features/admin/programs/services/get-program-version-publication-readiness";
import { runProgramVersionTests } from "@/features/admin/programs/services/run-program-version-tests";
import { updateDraftProgramConfiguration } from "@/features/admin/programs/services/update-draft-program-configuration";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";
import { disconnectTestDatabase, getTestDatabase } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
let scope: IntegrationTestScope;
let adminId: string;
let versionId: string;

async function run(executedById = adminId, programVersionId = versionId) {
  return runProgramVersionTests({ programVersionId, executedById }, database);
}

describe("program version test run and readiness", () => {
  beforeEach(async () => {
    scope = new IntegrationTestScope(database);
    adminId = (await scope.createAdmin()).id;
    versionId = (await scope.createProgramWithVersion(adminId)).version.id;
    await updateDraftProgramConfiguration(createValidDraftConfiguration(versionId, adminId), { database });
  });

  afterEach(() => scope.cleanup());
  afterAll(disconnectTestDatabase);

  it("정상 구성의 RuleTestRun을 저장한다", async () => {
    const result = await run();
    expect(await database.ruleTestRun.findUnique({ where: { id: result.testRunId } })).not.toBeNull();
  });

  it("RuleTestResult 개수가 테스트 사례 수와 일치한다", async () => {
    const result = await run();
    expect(await database.ruleTestResult.count({ where: { testRunId: result.testRunId } })).toBe(result.totalCount);
  });

  it("configurationHash를 SHA-256 문자열로 저장한다", async () => {
    const result = await run();
    expect(result.configurationHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await database.ruleTestRun.findUniqueOrThrow({ where: { id: result.testRunId } })).configurationHash).toBe(result.configurationHash);
  });

  it("전체 기대값이 일치하면 overallPassed=true다", async () => {
    expect((await run()).overallPassed).toBe(true);
  });

  it("전체 상태 기대값이 다르면 overallPassed=false다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { expectedOverallStatus: "NOT_ELIGIBLE" } });
    const result = await run();
    expect(result).toMatchObject({ overallPassed: false, failedCount: 1 });
  });

  it("expectedRuleOutcomes 불일치를 실패 사유로 기록한다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { expectedRuleOutcomes: { "1": "FAIL" } } });
    const result = await run();
    expect(result.results[0]?.failureReasons.join(" ")).toContain("규칙 1번");
  });

  it("존재하지 않는 관리자는 실행할 수 없다", async () => {
    await expect(run("missing-admin")).rejects.toMatchObject({ code: "ADMIN_NOT_FOUND" });
  });

  it("비활성 관리자는 실행할 수 없다", async () => {
    const inactive = await scope.createAdmin(false);
    await expect(run(inactive.id)).rejects.toMatchObject({ code: "ADMIN_INACTIVE" });
  });

  it("존재하지 않는 ProgramVersion은 실행할 수 없다", async () => {
    await expect(run(adminId, "missing-version")).rejects.toMatchObject({ code: "PROGRAM_VERSION_NOT_FOUND" });
  });

  it("비-DRAFT 버전은 실행할 수 없다", async () => {
    await database.programVersion.update({ where: { id: versionId }, data: { publicationStatus: "PUBLISHED" } });
    await expect(run()).rejects.toMatchObject({ code: "PROGRAM_VERSION_NOT_TESTABLE" });
  });

  it("테스트 사례가 없으면 실행하지 않는다", async () => {
    await database.ruleTestCase.deleteMany({ where: { programVersionId: versionId } });
    await expect(run()).rejects.toMatchObject({ code: "NO_TEST_CASES" });
  });

  it("게시 필수 테스트 사례가 없으면 실행하지 않는다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { requiredForPublish: false } });
    await expect(run()).rejects.toMatchObject({ code: "NO_REQUIRED_TEST_CASES" });
  });

  it("잘못된 규칙 구성은 실행 기록을 저장하지 않는다", async () => {
    await database.eligibilityRule.updateMany({ where: { programVersionId: versionId }, data: { expectedCondition: { broken: true } } });
    await expect(run()).rejects.toMatchObject({ code: "RULE_CONFIGURATION_INVALID" });
    expect(await database.ruleTestRun.count({ where: { programVersionId: versionId } })).toBe(0);
  });

  it("기대값 불일치는 실패 Run으로 저장한다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { expectedOverallStatus: "NOT_ELIGIBLE" } });
    const result = await run();
    expect(await database.ruleTestRun.findUniqueOrThrow({ where: { id: result.testRunId } })).toMatchObject({ overallPassed: false, failedCount: 1 });
  });

  it("테스트 실행 감사 로그를 생성한다", async () => {
    const result = await run();
    expect(await database.adminAuditLog.count({ where: { action: "TEST_RUN", entityId: versionId, adminUserId: adminId } })).toBe(1);
    expect(result.testRunId).toBeTruthy();
  });

  it("감사 로그에 inputSnapshot을 저장하지 않는다", async () => {
    await run();
    const audit = await database.adminAuditLog.findFirstOrThrow({ where: { action: "TEST_RUN", entityId: versionId } });
    expect(JSON.stringify(audit)).not.toContain("birthDate");
  });

  it("readiness가 최신 실행 hash 일치를 확인한다", async () => {
    await run();
    const readiness = await getProgramVersionPublicationReadiness({ programVersionId: versionId }, database);
    expect(readiness.checks.find(({ code }) => code === "LATEST_TEST_CONFIGURATION_MATCH")?.passed).toBe(true);
    expect(readiness.ready).toBe(true);
  });

  it("현재 구성이 바뀌면 readiness hash 불일치를 반환한다", async () => {
    await run();
    await database.programVersion.update({ where: { id: versionId }, data: { checkedAt: new Date("2026-07-20") } });
    const readiness = await getProgramVersionPublicationReadiness({ programVersionId: versionId }, database);
    expect(readiness.checks.find(({ code }) => code === "LATEST_TEST_CONFIGURATION_MATCH")?.passed).toBe(false);
  });

  it("최신 실행 실패 시 readiness=false다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { expectedOverallStatus: "NOT_ELIGIBLE" } });
    await run();
    expect((await getProgramVersionPublicationReadiness({ programVersionId: versionId }, database)).ready).toBe(false);
  });

  it("다른 ProgramVersion의 테스트 이력과 격리한다", async () => {
    const other = await scope.createProgramWithVersion(adminId);
    await updateDraftProgramConfiguration(createValidDraftConfiguration(other.version.id, adminId), { database });
    await run();
    const readiness = await getProgramVersionPublicationReadiness({ programVersionId: other.version.id }, database);
    expect(readiness.latestTestRun).toBeNull();
  });

  it("독립 scope 정리 후 실행 기록이 남지 않는다", async () => {
    const isolated = new IntegrationTestScope(database);
    const admin = await isolated.createAdmin();
    const version = await isolated.createProgramWithVersion(admin.id);
    await updateDraftProgramConfiguration(createValidDraftConfiguration(version.version.id, admin.id), { database });
    const result = await runProgramVersionTests({ programVersionId: version.version.id, executedById: admin.id }, database);
    await isolated.cleanup();
    expect(await database.ruleTestRun.findUnique({ where: { id: result.testRunId } })).toBeNull();
  });
});
