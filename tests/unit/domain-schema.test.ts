import { describe, expect, it } from "vitest";
import {
  EligibilityRuleCreateSchema,
  ProgramSourceCreateSchema,
  ProgramVersionCreateSchema,
} from "@/schemas";

const baseRule = {
  programVersionId: "version-1",
  displayOrder: 0,
  label: "대상 조건",
  description: "공식 공고의 대상 조건",
  required: true,
  reviewRequired: false,
  missingValueBehavior: "UNKNOWN" as const,
  passMessage: "조건을 충족합니다.",
  failureMessage: "조건을 충족하지 않습니다.",
  unknownMessage: "추가 확인이 필요합니다.",
  active: true,
};

const baseProgramVersion = {
  programId: "program-1",
  versionNumber: 1,
  title: "부산 청년 지원제도",
  shortDescription: "공식 지원제도 요약",
  fullDescription: "공식 지원제도 상세 설명",
  targetSummary: "부산 거주 청년",
  benefitType: "서비스",
  amountType: "UNDETERMINED" as const,
  applicationType: "FIXED_PERIOD" as const,
  applicationStartDate: "2026-07-01",
  applicationEndDate: "2026-07-31",
  applicationMethod: "공식 홈페이지 신청",
  applicationUrl: "https://www.busan.go.kr/",
  contactInformation: "부산광역시 담당 부서",
  requiredDocuments: [],
  checkedAt: "2026-07-19",
  publicationStatus: "DRAFT" as const,
  createdById: "admin-1",
};

describe("EligibilityRuleCreateSchema", () => {
  it("정상적인 AGE 규칙을 허용한다", () => {
    const result = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "AGE",
      expectedCondition: {
        minimumAge: 18,
        maximumAge: 39,
        referenceDate: "APPLICATION_DATE",
      },
    });

    expect(result.success).toBe(true);
  });

  it("최소 연령이 최대 연령보다 큰 AGE 규칙을 거부한다", () => {
    const result = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "AGE",
      expectedCondition: {
        minimumAge: 40,
        maximumAge: 20,
        referenceDate: "APPLICATION_DATE",
      },
    });

    expect(result.success).toBe(false);
  });

  it("REGION 규칙의 허용 구·군 코드 배열을 검증한다", () => {
    const valid = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "REGION",
      expectedCondition: {
        cityCode: "26000",
        coverage: "DISTRICT",
        allowedDistrictCodes: ["26110", "26140"],
      },
    });
    const invalid = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "REGION",
      expectedCondition: {
        cityCode: "26000",
        coverage: "DISTRICT",
        allowedDistrictCodes: [],
      },
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("MANUAL_REVIEW 규칙은 reviewRequired를 강제한다", () => {
    const valid = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      reviewRequired: true,
      ruleType: "MANUAL_REVIEW",
      expectedCondition: {
        reviewPrompt: "고용보험 가입 이력을 확인하세요.",
      },
    });
    const invalid = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "MANUAL_REVIEW",
      expectedCondition: {
        reviewPrompt: "고용보험 가입 이력을 확인하세요.",
      },
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("ruleType과 expectedCondition이 일치하지 않으면 거부한다", () => {
    const result = EligibilityRuleCreateSchema.safeParse({
      ...baseRule,
      ruleType: "AGE",
      expectedCondition: {
        cityCode: "26000",
        coverage: "CITY_WIDE",
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("ProgramVersionCreateSchema", () => {
  it("날짜 전용 ISO 형식을 검증한다", () => {
    const result = ProgramVersionCreateSchema.safeParse({
      ...baseProgramVersion,
      checkedAt: "2026/07/19",
    });

    expect(result.success).toBe(false);
  });

  it("기간형 신청에는 시작일과 종료일을 요구한다", () => {
    const result = ProgramVersionCreateSchema.safeParse({
      ...baseProgramVersion,
      applicationEndDate: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("상시 신청에는 시작일과 종료일을 허용하지 않는다", () => {
    const result = ProgramVersionCreateSchema.safeParse({
      ...baseProgramVersion,
      applicationType: "ALWAYS_OPEN",
    });

    expect(result.success).toBe(false);
  });
});

describe("ProgramSourceCreateSchema", () => {
  it("공식 출처 URL 형식을 검증한다", () => {
    const result = ProgramSourceCreateSchema.safeParse({
      programVersionId: "version-1",
      sourceType: "OFFICIAL_PAGE",
      organizationName: "부산광역시",
      documentTitle: "공식 지원사업 안내",
      sourceUrl: "not-a-url",
      checkedAt: "2026-07-19",
      isPrimary: true,
    });

    expect(result.success).toBe(false);
  });
});
