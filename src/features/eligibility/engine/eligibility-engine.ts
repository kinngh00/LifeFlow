import type { RuleOutcome } from "@/generated/prisma/enums";
import {
  ageConditionSchema,
  applicationPeriodConditionSchema,
  employmentConditionSchema,
  housingConditionSchema,
  incomeBandConditionSchema,
  manualReviewConditionSchema,
  regionConditionSchema,
  studentConditionSchema,
} from "@/schemas/eligibility-rule.schema";
import type {
  EligibilityEvaluation,
  EvaluateEligibilityInput,
  EvaluatedRuleResult,
  ExecutableEligibilityRule,
} from "../types/eligibility-engine.types";

function isUnknown(value: unknown): value is undefined | null | "UNKNOWN" {
  return value === undefined || value === null || value === "UNKNOWN";
}

function messageFor(rule: ExecutableEligibilityRule, outcome: RuleOutcome): string {
  if (outcome === "PASS") return rule.passMessage;
  if (outcome === "FAIL") return rule.failureMessage;
  return rule.unknownMessage;
}

function result(
  rule: ExecutableEligibilityRule,
  outcome: RuleOutcome,
  reasonCode: string,
  userValue: EvaluatedRuleResult["userValue"],
  expectedValue: unknown,
): EvaluatedRuleResult {
  return {
    ruleId: rule.id,
    ruleType: rule.ruleType,
    displayOrder: rule.displayOrder,
    outcome,
    reasonCode,
    userValue,
    expectedValue,
    approvedMessage: messageFor(rule, outcome),
    sourceId: rule.sourceId,
    sourceLocation: rule.sourceLocation,
    reviewRequired: rule.reviewRequired,
  };
}

function missing(rule: ExecutableEligibilityRule, expected: unknown) {
  return result(rule, rule.missingValueBehavior, "MISSING_VALUE", null, expected);
}

function calculateFullAge(birthDate: string, referenceDate: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = referenceDate.split("-").map(Number);
  let age = year! - birthYear!;
  if (month! < birthMonth! || (month === birthMonth && day! < birthDay!)) age -= 1;
  return age;
}

function evaluateRule(
  rule: ExecutableEligibilityRule,
  evaluation: EvaluateEligibilityInput,
): EvaluatedRuleResult {
  const input = evaluation.input;

  switch (rule.ruleType) {
    case "AGE": {
      const condition = ageConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.birthDate)) return missing(rule, condition);
      const referenceDate =
        condition.referenceDate === "NOTICE_DATE"
          ? evaluation.context.checkedAt
          : input.evaluationDate;
      const age = calculateFullAge(input.birthDate, referenceDate);
      const passesMinimum = condition.minimumAge === undefined || age >= condition.minimumAge;
      const passesMaximum = condition.maximumAge === undefined || age <= condition.maximumAge;
      return result(rule, passesMinimum && passesMaximum ? "PASS" : "FAIL", passesMinimum && passesMaximum ? "AGE_IN_RANGE" : "AGE_OUT_OF_RANGE", age, condition);
    }
    case "REGION": {
      const condition = regionConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.residenceCityCode)) return missing(rule, condition);
      if (input.residenceCityCode !== condition.cityCode) return result(rule, "FAIL", "CITY_NOT_ALLOWED", input.residenceCityCode, condition);
      if (rule.reviewRequired) return result(rule, "UNKNOWN", "REGION_REVIEW_REQUIRED", input.residenceCityCode, condition);
      if (condition.coverage === "CITY_WIDE") return result(rule, "PASS", "CITY_ALLOWED", input.residenceCityCode, condition);
      if (isUnknown(input.residenceDistrictCode)) return missing(rule, condition);
      const passed = condition.allowedDistrictCodes!.includes(input.residenceDistrictCode);
      return result(rule, passed ? "PASS" : "FAIL", passed ? "DISTRICT_ALLOWED" : "DISTRICT_NOT_ALLOWED", input.residenceDistrictCode, condition);
    }
    case "EMPLOYMENT": {
      const condition = employmentConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.employmentStatus)) return missing(rule, condition);
      const passed = condition.allowedStatuses.includes(input.employmentStatus);
      return result(rule, passed ? "PASS" : "FAIL", passed ? "EMPLOYMENT_ALLOWED" : "EMPLOYMENT_NOT_ALLOWED", input.employmentStatus, condition.allowedStatuses);
    }
    case "STUDENT": {
      const condition = studentConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.studentStatus)) return missing(rule, condition);
      const passed = condition.allowedStatuses.includes(input.studentStatus);
      return result(rule, passed ? "PASS" : "FAIL", passed ? "STUDENT_STATUS_ALLOWED" : "STUDENT_STATUS_NOT_ALLOWED", input.studentStatus, condition.allowedStatuses);
    }
    case "INCOME_BAND": {
      const condition = incomeBandConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.incomeBand)) return missing(rule, condition);
      const passed = condition.allowedBands.includes(input.incomeBand);
      return result(rule, passed ? "PASS" : "FAIL", passed ? "INCOME_BAND_ALLOWED" : "INCOME_BAND_NOT_ALLOWED", input.incomeBand, condition.allowedBands);
    }
    case "HOUSING": {
      const condition = housingConditionSchema.parse(rule.expectedCondition);
      if (isUnknown(input.housingType)) return missing(rule, condition);
      if (!condition.allowedHousingTypes.includes(input.housingType)) {
        return result(rule, "FAIL", "HOUSING_TYPE_NOT_ALLOWED", input.housingType, condition);
      }
      if (condition.requiresNoHomeOwnership) {
        if (isUnknown(input.homeOwnershipStatus)) return missing(rule, condition);
        if (input.homeOwnershipStatus !== "NO_HOME") {
          return result(rule, "FAIL", "HOME_OWNERSHIP_NOT_ALLOWED", input.homeOwnershipStatus, condition);
        }
      }
      return result(rule, "PASS", "HOUSING_ALLOWED", input.housingType, condition);
    }
    case "APPLICATION_PERIOD": {
      const condition = applicationPeriodConditionSchema.parse(rule.expectedCondition);
      if (evaluation.context.applicationType === "ALWAYS_OPEN") {
        return result(rule, "PASS", "APPLICATION_ALWAYS_OPEN", input.evaluationDate, "ALWAYS_OPEN");
      }
      if (evaluation.context.applicationType === "BUDGET_EXHAUSTION") {
        return result(rule, "UNKNOWN", "BUDGET_STATUS_REVIEW_REQUIRED", input.evaluationDate, "BUDGET_EXHAUSTION");
      }
      const start = evaluation.context.applicationStartDate ?? condition.startDate;
      const end = evaluation.context.applicationEndDate ?? condition.endDate;
      const passed = input.evaluationDate >= start && input.evaluationDate <= end;
      return result(rule, passed ? "PASS" : "FAIL", passed ? "APPLICATION_PERIOD_OPEN" : "APPLICATION_PERIOD_CLOSED", input.evaluationDate, { startDate: start, endDate: end });
    }
    case "MANUAL_REVIEW": {
      const condition = manualReviewConditionSchema.parse(rule.expectedCondition);
      return result(rule, "UNKNOWN", "MANUAL_REVIEW_REQUIRED", null, condition.reviewPrompt);
    }
  }
}

export function evaluateProgramEligibility(
  evaluation: EvaluateEligibilityInput,
): EligibilityEvaluation {
  const activeRules = evaluation.rules
    .filter(({ active }) => active)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  if (!activeRules.some(({ required }) => required)) {
    return { status: "UNDETERMINED", ruleResults: [], executable: false, executionError: "활성 필수 규칙이 없습니다." };
  }

  const ruleResults: EvaluatedRuleResult[] = [];
  try {
    for (const rule of activeRules) {
      const evaluated = evaluateRule(rule, evaluation);
      ruleResults.push(
        rule.reviewRequired && evaluated.outcome === "PASS"
          ? result(rule, "UNKNOWN", "REVIEW_REQUIRED", evaluated.userValue, evaluated.expectedValue)
          : evaluated,
      );
    }
  } catch {
    return { status: "UNDETERMINED", ruleResults, executable: false, executionError: "규칙 구성이 올바르지 않습니다." };
  }

  const requiredResults = ruleResults.filter((item) =>
    activeRules.find(({ id }) => id === item.ruleId)?.required,
  );
  const status = requiredResults.some(({ outcome }) => outcome === "FAIL")
    ? "NOT_ELIGIBLE"
    : requiredResults.some(({ outcome }) => outcome === "UNKNOWN")
      ? "NEEDS_REVIEW"
      : "ELIGIBLE";
  return { status, ruleResults, executable: true, executionError: null };
}
