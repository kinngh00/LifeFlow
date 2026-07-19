import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDraftVersionFromPublished } from "@/features/admin/programs/services/create-draft-version-from-published";
import { publishProgramVersion } from "@/features/admin/programs/services/publish-program-version";
import { runProgramVersionTests } from "@/features/admin/programs/services/run-program-version-tests";
import { updateDraftProgramConfiguration } from "@/features/admin/programs/services/update-draft-program-configuration";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";
import { disconnectTestDatabase, getTestDatabase } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
let scope: IntegrationTestScope;
let adminId: string;
let programId: string;
let versionId: string;

async function prepareReadyDraft() {
  const created = await scope.createProgramWithVersion(adminId);
  programId = created.program.id;
  versionId = created.version.id;
  await updateDraftProgramConfiguration(createValidDraftConfiguration(versionId, adminId), { database });
  await runProgramVersionTests({ programVersionId: versionId, executedById: adminId }, database);
}

async function publish(id = versionId) {
  return publishProgramVersion(
    { programVersionId: id, publishedById: adminId, reason: "통합 테스트 게시" },
    database,
  );
}

async function publishAndCreateDraft() {
  await publish();
  return createDraftVersionFromPublished({ programId, createdById: adminId }, database);
}

async function publishReplacement() {
  const draft = await publishAndCreateDraft();
  await runProgramVersionTests(
    { programVersionId: draft.draftVersion.id, executedById: adminId },
    database,
  );
  return publish(draft.draftVersion.id);
}

describe("program publication lifecycle", () => {
  beforeEach(async () => {
    scope = new IntegrationTestScope(database);
    adminId = (await scope.createAdmin()).id;
    await prepareReadyDraft();
  });

  afterEach(() => scope.cleanup());
  afterAll(disconnectTestDatabase);

  it("clones NATIONAL coverage without assigning Busan codes", async () => {
    await database.programRegion.updateMany({
      where: { programVersionId: versionId },
      data: { coverageType: "NATIONAL", cityCode: null, districtCode: null },
    });
    await runProgramVersionTests({ programVersionId: versionId, executedById: adminId }, database);
    const result = await publishAndCreateDraft();
    expect(await database.programRegion.findFirstOrThrow({ where: { programVersionId: result.draftVersion.id } })).toMatchObject({
      coverageType: "NATIONAL",
      cityCode: null,
      districtCode: null,
    });
  });

  it("1. 최초 DRAFT를 게시한다", async () => {
    expect((await publish()).publishedVersion.publicationStatus).toBe("PUBLISHED");
  });
  it("2. publicationStatus를 PUBLISHED로 저장한다", async () => {
    await publish();
    expect((await database.programVersion.findUniqueOrThrow({ where: { id: versionId } })).publicationStatus).toBe("PUBLISHED");
  });
  it("3. publishedAt을 저장한다", async () => {
    await publish();
    expect((await database.programVersion.findUniqueOrThrow({ where: { id: versionId } })).publishedAt).toBeInstanceOf(Date);
  });
  it("4. currentPublishedVersionId를 설정한다", async () => {
    await publish();
    expect((await database.supportProgram.findUniqueOrThrow({ where: { id: programId } })).currentPublishedVersionId).toBe(versionId);
  });
  it("5. PublicationEvent를 생성한다", async () => {
    const result = await publish();
    expect(await database.publicationEvent.findUnique({ where: { id: result.publicationEventId } })).toMatchObject({ eventType: "PUBLISHED", programVersionId: versionId });
  });
  it("6. 게시 감사 로그를 생성한다", async () => {
    await publish();
    expect(await database.adminAuditLog.count({ where: { action: "PUBLISH", entityId: versionId, adminUserId: adminId } })).toBe(1);
  });
  it("7. 준비 미충족 버전 게시를 차단한다", async () => {
    await database.programSource.updateMany({ where: { programVersionId: versionId }, data: { isPrimary: false } });
    await expect(publish()).rejects.toMatchObject({ code: "TEST_CONFIGURATION_OUTDATED" });
  });
  it("8. 테스트 실행이 없으면 게시를 차단한다", async () => {
    const runs = await database.ruleTestRun.findMany({ where: { programVersionId: versionId }, select: { id: true } });
    await database.ruleTestResult.deleteMany({ where: { testRunId: { in: runs.map(({ id }) => id) } } });
    await database.ruleTestRun.deleteMany({ where: { programVersionId: versionId } });
    await expect(publish()).rejects.toMatchObject({ code: "PUBLICATION_READINESS_FAILED" });
  });
  it("9. 최신 테스트 실패 시 게시를 차단한다", async () => {
    await database.ruleTestCase.updateMany({ where: { programVersionId: versionId }, data: { expectedOverallStatus: "NOT_ELIGIBLE" } });
    await runProgramVersionTests({ programVersionId: versionId, executedById: adminId }, database);
    await expect(publish()).rejects.toMatchObject({ code: "PUBLICATION_READINESS_FAILED" });
  });
  it("10. configurationHash 불일치를 차단한다", async () => {
    await database.programVersion.update({ where: { id: versionId }, data: { checkedAt: new Date("2026-07-20") } });
    await expect(publish()).rejects.toMatchObject({ code: "TEST_CONFIGURATION_OUTDATED" });
  });
  it("11. 이미 게시된 버전의 재게시를 차단한다", async () => {
    await publish();
    await expect(publish()).rejects.toMatchObject({ code: "PROGRAM_VERSION_ALREADY_PUBLISHED" });
  });
  it("12. 기존 게시 버전을 새 버전으로 교체한다", async () => {
    const result = await publishReplacement();
    expect(result.previousPublishedVersion?.id).toBe(versionId);
    expect(result.publishedVersion.versionNumber).toBe(2);
  });
  it("13. 이전 게시 버전을 UNPUBLISHED로 전환한다", async () => {
    await publishReplacement();
    expect((await database.programVersion.findUniqueOrThrow({ where: { id: versionId } })).publicationStatus).toBe("UNPUBLISHED");
  });
  it("14. currentPublishedVersionId를 새 버전으로 원자 교체한다", async () => {
    const result = await publishReplacement();
    expect((await database.supportProgram.findUniqueOrThrow({ where: { id: programId } })).currentPublishedVersionId).toBe(result.publishedVersion.id);
  });
  it("15. 게시 중 오류가 발생하면 상태 변경을 전부 롤백한다", async () => {
    await expect(
      publishProgramVersion(
        { programVersionId: versionId, publishedById: adminId, reason: "롤백" },
        database,
        { createPublicationEvent: async () => { throw new Error("injected publication failure"); } },
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(await database.programVersion.findUniqueOrThrow({ where: { id: versionId } })).toMatchObject({ publicationStatus: "DRAFT", publishedAt: null });
    expect((await database.supportProgram.findUniqueOrThrow({ where: { id: programId } })).currentPublishedVersionId).toBeNull();
  });
  it("16. 동일 DRAFT 동시 게시 요청은 하나만 성공한다", async () => {
    const results = await Promise.allSettled([publish(), publish()]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  });

  it("17. 현재 게시 버전을 새 DRAFT로 복제한다", async () => {
    const result = await publishAndCreateDraft();
    expect(result.sourceVersionId).toBe(versionId);
  });
  it("18. 새 DRAFT의 버전 번호를 증가시킨다", async () => {
    expect((await publishAndCreateDraft()).draftVersion.versionNumber).toBe(2);
  });
  it("19. 복제 버전을 DRAFT 상태로 저장한다", async () => {
    const result = await publishAndCreateDraft();
    expect((await database.programVersion.findUniqueOrThrow({ where: { id: result.draftVersion.id } })).publicationStatus).toBe("DRAFT");
  });
  it("20. DRAFT 생성 후 currentPublishedVersionId를 유지한다", async () => {
    await publishAndCreateDraft();
    expect((await database.supportProgram.findUniqueOrThrow({ where: { id: programId } })).currentPublishedVersionId).toBe(versionId);
  });
  it("21. 출처·지역·규칙·테스트 사례를 복제한다", async () => {
    const result = await publishAndCreateDraft();
    const stored = await database.programVersion.findUniqueOrThrow({ where: { id: result.draftVersion.id }, include: { _count: { select: { sources: true, regions: true, eligibilityRules: true, ruleTestCases: true } } } });
    expect(stored._count).toMatchObject({ sources: 1, regions: 1, eligibilityRules: 1, ruleTestCases: 1 });
  });
  it("22. RuleTestRun과 Result를 복제하지 않는다", async () => {
    const result = await publishAndCreateDraft();
    expect(await database.ruleTestRun.count({ where: { programVersionId: result.draftVersion.id } })).toBe(0);
    expect(await database.ruleTestResult.count({ where: { testCase: { programVersionId: result.draftVersion.id } } })).toBe(0);
  });
  it("23. 복제 규칙을 새 출처 ID에 연결한다", async () => {
    const originalSource = await database.programSource.findFirstOrThrow({ where: { programVersionId: versionId } });
    const result = await publishAndCreateDraft();
    const clonedRule = await database.eligibilityRule.findFirstOrThrow({ where: { programVersionId: result.draftVersion.id } });
    expect(clonedRule.sourceId).not.toBe(originalSource.id);
    expect(await database.programSource.findFirst({ where: { id: clonedRule.sourceId!, programVersionId: result.draftVersion.id } })).not.toBeNull();
  });
  it("24. 기존 DRAFT가 있으면 새 DRAFT를 차단한다", async () => {
    const first = await publishAndCreateDraft();
    await expect(createDraftVersionFromPublished({ programId, createdById: adminId }, database)).rejects.toMatchObject({ code: "DRAFT_VERSION_ALREADY_EXISTS", details: { draftVersionId: first.draftVersion.id } });
  });
  it("25. 다른 프로그램의 sourceVersionId를 차단한다", async () => {
    await publish();
    const other = await scope.createProgramWithVersion(adminId, "PUBLISHED");
    await expect(createDraftVersionFromPublished({ programId, createdById: adminId, sourceVersionId: other.version.id }, database)).rejects.toMatchObject({ code: "SOURCE_VERSION_NOT_IN_PROGRAM" });
  });
  it("26. 복제 중 오류가 발생하면 전체 롤백한다", async () => {
    await publish();
    await expect(
      createDraftVersionFromPublished(
        { programId, createdById: adminId },
        database,
        { createEligibilityRule: async () => { throw new Error("injected clone failure"); } },
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(await database.programVersion.count({ where: { programId } })).toBe(1);
  });
  it("27. 동시 DRAFT 생성 요청은 하나만 성공한다", async () => {
    await publish();
    const results = await Promise.allSettled([
      createDraftVersionFromPublished({ programId, createdById: adminId }, database),
      createDraftVersionFromPublished({ programId, createdById: adminId }, database),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  });
  it("28. 새 DRAFT 감사 로그를 생성한다", async () => {
    const result = await publishAndCreateDraft();
    expect(await database.adminAuditLog.count({ where: { action: "CREATE", entityType: "ProgramVersion", entityId: result.draftVersion.id } })).toBe(1);
  });
});
