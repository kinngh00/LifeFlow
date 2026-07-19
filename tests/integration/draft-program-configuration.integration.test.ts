import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { updateDraftProgramConfiguration } from "@/features/admin/programs/services/update-draft-program-configuration";
import type { UpdateDraftProgramConfigurationInput } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";
import { disconnectTestDatabase, getTestDatabase } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
let scope: IntegrationTestScope;
let adminId: string;
let versionId: string;

function input(): UpdateDraftProgramConfigurationInput {
  return createValidDraftConfiguration(versionId, adminId);
}

async function update(value = input()) {
  return updateDraftProgramConfiguration(value, { database });
}

async function expectCode(value: UpdateDraftProgramConfigurationInput, code: string) {
  await expect(update(value)).rejects.toMatchObject({ code });
}

describe("updateDraftProgramConfiguration", () => {
  beforeEach(async () => {
    scope = new IntegrationTestScope(database);
    adminId = (await scope.createAdmin(true)).id;
    versionId = (await scope.createProgramWithVersion(adminId)).version.id;
  });

  afterEach(() => scope.cleanup());
  afterAll(disconnectTestDatabase);

  it("stores NATIONAL with null city and district codes", async () => {
    const value = input();
    value.regions = [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null }];
    await update(value);
    expect(await database.programRegion.findFirstOrThrow({ where: { programVersionId: versionId } })).toMatchObject({
      coverageType: "NATIONAL",
      cityCode: null,
      districtCode: null,
    });
  });

  it("rejects NATIONAL combined with a Busan code at the database boundary", async () => {
    await expect(database.programRegion.create({
      data: { programVersionId: versionId, coverageType: "NATIONAL", cityCode: "26000", districtCode: null },
    })).rejects.toBeTruthy();
  });

  it("rejects duplicate NATIONAL rows for one program version", async () => {
    await database.programRegion.create({
      data: { programVersionId: versionId, coverageType: "NATIONAL", cityCode: null, districtCode: null },
    });
    await expect(database.programRegion.create({
      data: { programVersionId: versionId, coverageType: "NATIONAL", cityCode: null, districtCode: null },
    })).rejects.toBeTruthy();
  });

  it("DRAFT에 출처·지역·규칙·테스트 사례를 저장한다", async () => {
    const result = await update();
    expect(result).toMatchObject({ sourceCount: 1, regionCount: 1, ruleCount: 1, testCaseCount: 1 });
  });

  it("대표 출처를 정확히 하나 생성한다", async () => {
    await update();
    expect(await database.programSource.count({ where: { programVersionId: versionId, isPrimary: true } })).toBe(1);
  });

  it("규칙 sourceId를 요청 출처에 연결한다", async () => {
    await update();
    const rule = await database.eligibilityRule.findFirstOrThrow({ where: { programVersionId: versionId }, include: { source: true } });
    expect(rule.source?.sourceUrl).toBe(input().sources[0]!.sourceUrl);
  });

  it("테스트 사례를 대상 버전에 생성한다", async () => {
    await update();
    expect(await database.ruleTestCase.count({ where: { programVersionId: versionId } })).toBe(1);
  });

  it("성공 시 감사 로그를 생성한다", async () => {
    await update();
    expect(await database.adminAuditLog.count({ where: { entityType: "ProgramVersion", entityId: versionId, action: "UPDATE" } })).toBe(1);
  });

  it("기존 DRAFT 하위 데이터를 전체 교체한다", async () => {
    await update();
    const replacement = input();
    replacement.sources[0]!.sourceUrl = "https://www.busan.go.kr/replaced";
    replacement.testCases[0]!.name = "교체된 사례";
    await update(replacement);
    expect(await database.programSource.count({ where: { programVersionId: versionId } })).toBe(1);
    expect(await database.programSource.findFirstOrThrow({ where: { programVersionId: versionId } })).toMatchObject({ sourceUrl: replacement.sources[0]!.sourceUrl });
  });

  it("같은 프로그램의 다른 ProgramVersion 데이터는 변경하지 않는다", async () => {
    const current = await database.programVersion.findUniqueOrThrow({ where: { id: versionId } });
    const other = await database.programVersion.create({ data: {
      programId: current.programId, versionNumber: 2, title: "다른 버전", shortDescription: "요약", fullDescription: "상세",
      targetSummary: "대상", benefitType: "서비스", amountType: "UNDETERMINED", applicationType: "ALWAYS_OPEN",
      applicationMethod: "온라인", contactInformation: "담당자", requiredDocuments: [], checkedAt: new Date("2026-07-19"), createdById: adminId,
    } });
    await database.programSource.create({ data: { programVersionId: other.id, sourceType: "OFFICIAL_PAGE", organizationName: "기관", documentTitle: "다른 자료", sourceUrl: "https://example.com/other", checkedAt: new Date("2026-07-19"), isPrimary: true } });
    await update();
    expect(await database.programSource.count({ where: { programVersionId: other.id } })).toBe(1);
  });

  it("존재하지 않는 관리자를 거부한다", async () => {
    const value = input(); value.updatedById = "missing-admin";
    await expectCode(value, "ADMIN_NOT_FOUND");
  });

  it("비활성 관리자를 거부한다", async () => {
    const value = input(); value.updatedById = (await scope.createAdmin(false)).id;
    await expectCode(value, "ADMIN_INACTIVE");
  });

  it("존재하지 않는 ProgramVersion을 거부한다", async () => {
    const value = input(); value.programVersionId = "missing-version";
    await expectCode(value, "PROGRAM_VERSION_NOT_FOUND");
  });

  it("PUBLISHED 버전 편집을 차단한다", async () => {
    await database.programVersion.update({ where: { id: versionId }, data: { publicationStatus: "PUBLISHED" } });
    await expectCode(input(), "PROGRAM_VERSION_NOT_EDITABLE");
  });

  it("UNPUBLISHED 버전 편집을 차단한다", async () => {
    await database.programVersion.update({ where: { id: versionId }, data: { publicationStatus: "UNPUBLISHED" } });
    await expectCode(input(), "PROGRAM_VERSION_NOT_EDITABLE");
  });

  it("대표 출처 0개를 거부한다", async () => {
    const value = input(); value.sources[0]!.isPrimary = false;
    await expectCode(value, "PRIMARY_SOURCE_REQUIRED");
  });

  it("대표 출처 2개를 거부한다", async () => {
    const value = input(); value.sources.push({ ...value.sources[0]!, sourceUrl: "https://example.com/second" });
    await expectCode(value, "MULTIPLE_PRIMARY_SOURCES");
  });

  it("중복 출처 URL을 거부한다", async () => {
    const value = input(); value.sources.push({ ...value.sources[0]!, isPrimary: false });
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("CITY_WIDE와 구·군 동시 등록을 거부한다", async () => {
    const value = input(); value.regions.push({ cityCode: "26000", districtCode: "26110", coverageType: "DISTRICT", reviewRequired: false });
    await expectCode(value, "REGION_CONFLICT");
  });

  it("CITY_WIDE의 districtCode가 ALL이 아니면 거부한다", async () => {
    const value = input(); (value.regions[0] as { districtCode: string }).districtCode = "26110";
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("잘못된 부산 구·군 코드를 거부한다", async () => {
    const value = input(); value.regions = [{ cityCode: "26000", districtCode: "26999", coverageType: "DISTRICT", reviewRequired: false } as never];
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("displayOrder 중복을 거부한다", async () => {
    const value = input(); value.rules.push({ ...value.rules[0]!, label: "중복" });
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("MANUAL_REVIEW의 reviewRequired=false를 거부한다", async () => {
    const value = input(); value.rules = [{ ...value.rules[0]!, ruleType: "MANUAL_REVIEW", reviewRequired: false, expectedCondition: { reviewPrompt: "확인" } } as never];
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("존재하지 않는 sourceIndex를 거부한다", async () => {
    const value = input(); value.rules[0]!.sourceReference.sourceIndex = 3;
    await expectCode(value, "RULE_SOURCE_REFERENCE_INVALID");
  });

  it("존재하지 않는 규칙을 참조한 테스트를 거부한다", async () => {
    const value = input(); value.testCases[0]!.expectedRuleOutcomes[0]!.displayOrder = 3;
    await expectCode(value, "TEST_RULE_REFERENCE_INVALID");
  });

  it("inputSnapshot 개인정보 키를 거부한다", async () => {
    const value = input(); value.testCases[0]!.inputSnapshot = { phone: "010-0000-0000" };
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("requiredForPublish 사례가 없으면 거부한다", async () => {
    const value = input(); value.testCases[0]!.requiredForPublish = false;
    await expectCode(value, "VALIDATION_ERROR");
  });

  it("규칙 생성 실패 시 앞선 출처·지역 생성을 롤백한다", async () => {
    await expect(updateDraftProgramConfiguration(input(), { database, createRule: async () => { throw new Error("rule failure"); } })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(await database.programSource.count({ where: { programVersionId: versionId } })).toBe(0);
    expect(await database.programRegion.count({ where: { programVersionId: versionId } })).toBe(0);
  });

  it("테스트 사례 생성 실패 시 전체 생성을 롤백한다", async () => {
    await expect(updateDraftProgramConfiguration(input(), { database, createTestCase: async () => { throw new Error("test failure"); } })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(await database.eligibilityRule.count({ where: { programVersionId: versionId } })).toBe(0);
    expect(await database.programSource.count({ where: { programVersionId: versionId } })).toBe(0);
  });

  it("기존 데이터 삭제 뒤 실패하면 기존 구성을 복구한다", async () => {
    const original = input(); await update(original);
    const replacement = input(); replacement.sources[0]!.sourceUrl = "https://example.com/new";
    await expect(updateDraftProgramConfiguration(replacement, { database, createRule: async () => { throw new Error("rule failure"); } })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(await database.programSource.findFirstOrThrow({ where: { programVersionId: versionId, isPrimary: true } })).toMatchObject({ sourceUrl: original.sources[0]!.sourceUrl });
  });

  it("다른 DRAFT 프로그램의 구성에 영향을 주지 않는다", async () => {
    const other = await scope.createProgramWithVersion(adminId);
    await updateDraftProgramConfiguration(createValidDraftConfiguration(other.version.id, adminId), { database });
    await update();
    expect(await database.programSource.count({ where: { programVersionId: other.version.id } })).toBe(1);
  });

  it("감사 로그에 전체 inputSnapshot을 저장하지 않는다", async () => {
    await update();
    const audit = await database.adminAuditLog.findFirstOrThrow({ where: { entityType: "ProgramVersion", entityId: versionId } });
    const serialized = JSON.stringify(audit);
    expect(serialized).not.toContain("birthDate");
    expect(serialized).not.toContain("residenceCityCode");
  });

  it("독립 scope 정리 후 생성 데이터가 남지 않는다", async () => {
    const isolated = new IntegrationTestScope(database);
    const admin = await isolated.createAdmin();
    const version = await isolated.createProgramWithVersion(admin.id);
    await updateDraftProgramConfiguration(createValidDraftConfiguration(version.version.id, admin.id), { database });
    await isolated.cleanup();
    expect(await database.programVersion.findUnique({ where: { id: version.version.id } })).toBeNull();
    expect(await database.adminAuditLog.count({ where: { entityId: version.version.id } })).toBe(0);
  });

  it("테스트 실행 이력이 있는 DRAFT의 교체를 차단한다", async () => {
    await update();
    await database.ruleTestRun.create({ data: { programVersionId: versionId, executedById: adminId, configurationHash: "test-hash", totalCount: 1, passedCount: 1, failedCount: 0, overallPassed: true } });
    await expectCode(input(), "PROGRAM_VERSION_NOT_EDITABLE");
  });
});
