import type { UpdateDraftProgramConfigurationInput } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";

export function createValidDraftConfiguration(
  programVersionId = "version-1",
  updatedById = "admin-1",
): UpdateDraftProgramConfigurationInput {
  return {
    programVersionId,
    updatedById,
    sources: [
      {
        sourceType: "OFFICIAL_PAGE",
        organizationName: "부산광역시",
        documentTitle: "공식 제도 안내",
        sourceUrl: "https://www.busan.go.kr/young/support",
        documentIdentifier: null,
        publishedAt: "2026-01-01",
        checkedAt: "2026-07-19",
        isPrimary: true,
        note: null,
      },
    ],
    regions: [
      {
        cityCode: "26000",
        districtCode: "ALL",
        coverageType: "CITY_WIDE",
        reviewRequired: false,
        requirementNote: null,
      },
    ],
    rules: [
      {
        ruleType: "AGE",
        displayOrder: 1,
        label: "연령 조건",
        description: "만 19세 이상 34세 이하",
        expectedCondition: {
          minimumAge: 19,
          maximumAge: 34,
          referenceDate: "APPLICATION_DATE",
        },
        required: true,
        reviewRequired: false,
        missingValueBehavior: "UNKNOWN",
        passMessage: "연령 조건을 충족합니다.",
        failureMessage: "연령 조건을 충족하지 않습니다.",
        unknownMessage: "연령 확인이 필요합니다.",
        sourceReference: { sourceIndex: 0 },
        sourceLocation: "지원 대상 항목",
        active: true,
      },
    ],
    testCases: [
      {
        name: "모든 필수 조건 충족",
        description: "정상 신청 가능 사례",
        inputSnapshot: {
          birthDate: "2000-01-01",
          residenceCityCode: "26000",
          evaluationDate: "2026-07-19",
        },
        expectedOverallStatus: "ELIGIBLE",
        expectedRuleOutcomes: [{ displayOrder: 1, outcome: "PASS" }],
        requiredForPublish: true,
      },
    ],
  };
}
