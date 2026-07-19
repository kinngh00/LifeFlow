import { Prisma } from "@/generated/prisma/client";
import type { ProgramTestConfigurationRecord } from "@/features/admin/programs/services/program-test-configuration.select";

export function createProgramTestRecord(): ProgramTestConfigurationRecord {
  return {
    id: "version-1",
    amountType: "UNDETERMINED",
    minimumAmount: null,
    maximumAmount: null,
    applicationType: "ALWAYS_OPEN",
    applicationStartDate: null,
    applicationEndDate: null,
    checkedAt: new Date("2026-07-19T00:00:00.000Z"),
    publicationStatus: "DRAFT",
    reviewedAt: null,
    sources: [{
      sourceType: "OFFICIAL_PAGE",
      organizationName: "부산광역시",
      documentTitle: "공식 안내",
      sourceUrl: "https://www.busan.go.kr/program",
      documentIdentifier: null,
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      checkedAt: new Date("2026-07-19T00:00:00.000Z"),
      isPrimary: true,
    }],
    regions: [{ cityCode: "26000", districtCode: "ALL", coverageType: "CITY_WIDE", reviewRequired: false, requirementNote: null }],
    eligibilityRules: [{
      id: "rule-1",
      ruleType: "AGE",
      displayOrder: 1,
      expectedCondition: { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" },
      required: true,
      reviewRequired: false,
      missingValueBehavior: "UNKNOWN",
      passMessage: "통과",
      failureMessage: "실패",
      unknownMessage: "확인 필요",
      sourceId: "source-1",
      sourceLocation: "지원 대상",
      active: true,
      source: { sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", sourceUrl: "https://www.busan.go.kr/program", documentIdentifier: null },
    }],
    ruleTestCases: [{
      id: "case-1",
      name: "정상 사례",
      inputSnapshot: { birthDate: "2000-01-01", evaluationDate: "2026-07-19" },
      expectedOverallStatus: "ELIGIBLE",
      expectedRuleOutcomes: { "1": "PASS" },
      requiredForPublish: true,
    }],
  } satisfies ProgramTestConfigurationRecord;
}

export { Prisma };
