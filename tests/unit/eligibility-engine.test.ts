import { describe, expect, it } from "vitest";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import type { EvaluateEligibilityInput, ExecutableEligibilityRule } from "@/features/eligibility/types/eligibility-engine.types";

const baseInput = { evaluationDate: "2026-07-19" } as const;
const context = { applicationType: "FIXED_PERIOD", applicationStartDate: "2026-07-01", applicationEndDate: "2026-07-31", checkedAt: "2026-07-01" } as const;

function rule(overrides: Partial<ExecutableEligibilityRule> = {}): ExecutableEligibilityRule {
  return {
    id: "rule-1", ruleType: "AGE", displayOrder: 1,
    expectedCondition: { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" },
    required: true, reviewRequired: false, missingValueBehavior: "UNKNOWN",
    passMessage: "통과", failureMessage: "실패", unknownMessage: "확인 필요",
    sourceId: "source-1", sourceLocation: "지원 대상", active: true,
    ...overrides,
  };
}

function evaluate(overrides: Partial<EvaluateEligibilityInput> = {}) {
  return evaluateProgramEligibility({ rules: [rule()], input: baseInput, context, ...overrides });
}

describe("eligibility engine", () => {
  it("AGE 최소 경계를 PASS 처리한다", () => expect(evaluate({ input: { ...baseInput, birthDate: "2007-07-19" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("AGE 최대 경계를 PASS 처리한다", () => expect(evaluate({ input: { ...baseInput, birthDate: "1992-07-19" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("AGE 범위 밖은 FAIL이다", () => expect(evaluate({ input: { ...baseInput, birthDate: "2010-01-01" } }).ruleResults[0]?.outcome).toBe("FAIL"));
  it("AGE 값이 없으면 UNKNOWN이다", () => expect(evaluate().ruleResults[0]?.outcome).toBe("UNKNOWN"));

  it("REGION 부산 전체는 PASS다", () => expect(evaluate({ rules: [rule({ ruleType: "REGION", expectedCondition: { cityCode: "26000", coverage: "CITY_WIDE" } })], input: { ...baseInput, residenceCityCode: "26000" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("REGION 부산 외 지역은 FAIL이다", () => expect(evaluate({ rules: [rule({ ruleType: "REGION", expectedCondition: { cityCode: "26000", coverage: "CITY_WIDE" } })], input: { ...baseInput, residenceCityCode: "11000" } }).ruleResults[0]?.outcome).toBe("FAIL"));
  it("REGION 값이 없으면 UNKNOWN이다", () => expect(evaluate({ rules: [rule({ ruleType: "REGION", expectedCondition: { cityCode: "26000", coverage: "CITY_WIDE" } })] }).ruleResults[0]?.outcome).toBe("UNKNOWN"));

  it("EMPLOYMENT 허용 상태는 PASS다", () => expect(evaluate({ rules: [rule({ ruleType: "EMPLOYMENT", expectedCondition: { allowedStatuses: ["JOB_SEEKER"] } })], input: { ...baseInput, employmentStatus: "JOB_SEEKER" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("EMPLOYMENT 불일치는 FAIL이다", () => expect(evaluate({ rules: [rule({ ruleType: "EMPLOYMENT", expectedCondition: { allowedStatuses: ["JOB_SEEKER"] } })], input: { ...baseInput, employmentStatus: "EMPLOYED" } }).ruleResults[0]?.outcome).toBe("FAIL"));
  it("STUDENT 값 없음은 UNKNOWN이다", () => expect(evaluate({ rules: [rule({ ruleType: "STUDENT", expectedCondition: { allowedStatuses: ["ENROLLED"] } })] }).ruleResults[0]?.outcome).toBe("UNKNOWN"));
  it("INCOME_BAND 허용 구간은 PASS다", () => expect(evaluate({ rules: [rule({ ruleType: "INCOME_BAND", expectedCondition: { allowedBands: ["100% 이하"] } })], input: { ...baseInput, incomeBand: "100% 이하" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("INCOME_BAND 모름은 UNKNOWN이다", () => expect(evaluate({ rules: [rule({ ruleType: "INCOME_BAND", expectedCondition: { allowedBands: ["100% 이하"] } })], input: { ...baseInput, incomeBand: "UNKNOWN" } }).ruleResults[0]?.outcome).toBe("UNKNOWN"));
  it("HOUSING 하위 조건 하나가 실패하면 FAIL이다", () => expect(evaluate({ rules: [rule({ ruleType: "HOUSING", expectedCondition: { allowedHousingTypes: ["MONTHLY_RENT"], requiresNoHomeOwnership: true } })], input: { ...baseInput, housingType: "MONTHLY_RENT", homeOwnershipStatus: "OWNS_HOME" } }).ruleResults[0]?.outcome).toBe("FAIL"));

  it("APPLICATION_PERIOD 시작일은 PASS다", () => expect(evaluate({ rules: [rule({ ruleType: "APPLICATION_PERIOD", expectedCondition: { startDate: "2026-07-01", endDate: "2026-07-31" } })], input: { evaluationDate: "2026-07-01" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("APPLICATION_PERIOD 종료일은 PASS다", () => expect(evaluate({ rules: [rule({ ruleType: "APPLICATION_PERIOD", expectedCondition: { startDate: "2026-07-01", endDate: "2026-07-31" } })], input: { evaluationDate: "2026-07-31" } }).ruleResults[0]?.outcome).toBe("PASS"));
  it("신청 기간 전은 FAIL이다", () => expect(evaluate({ rules: [rule({ ruleType: "APPLICATION_PERIOD", expectedCondition: { startDate: "2026-07-01", endDate: "2026-07-31" } })], input: { evaluationDate: "2026-06-30" } }).ruleResults[0]?.outcome).toBe("FAIL"));
  it("신청 기간 후는 FAIL이다", () => expect(evaluate({ rules: [rule({ ruleType: "APPLICATION_PERIOD", expectedCondition: { startDate: "2026-07-01", endDate: "2026-07-31" } })], input: { evaluationDate: "2026-08-01" } }).ruleResults[0]?.outcome).toBe("FAIL"));
  it("MANUAL_REVIEW는 UNKNOWN이다", () => expect(evaluate({ rules: [rule({ ruleType: "MANUAL_REVIEW", reviewRequired: true, expectedCondition: { reviewPrompt: "서류 확인" } })] }).ruleResults[0]?.outcome).toBe("UNKNOWN"));

  it("필수 FAIL 하나로 NOT_ELIGIBLE이다", () => expect(evaluate({ input: { ...baseInput, birthDate: "2010-01-01" } }).status).toBe("NOT_ELIGIBLE"));
  it("FAIL 없이 필수 UNKNOWN이면 NEEDS_REVIEW다", () => expect(evaluate().status).toBe("NEEDS_REVIEW"));
  it("모든 필수 규칙이 PASS면 ELIGIBLE이다", () => expect(evaluate({ input: { ...baseInput, birthDate: "2000-01-01" } }).status).toBe("ELIGIBLE"));
  it("잘못된 규칙 구성은 UNDETERMINED이고 실행 불가다", () => expect(evaluate({ rules: [rule({ expectedCondition: { broken: true } })] })).toMatchObject({ status: "UNDETERMINED", executable: false }));
  it("선택 규칙 FAIL은 전체 상태를 바꾸지 않는다", () => {
    const result = evaluate({ rules: [rule(), rule({ id: "optional", ruleType: "EMPLOYMENT", displayOrder: 2, required: false, expectedCondition: { allowedStatuses: ["JOB_SEEKER"] } })], input: { ...baseInput, birthDate: "2000-01-01", employmentStatus: "EMPLOYED" } });
    expect(result.status).toBe("ELIGIBLE");
  });
});
