import type { RuleOutcome, RuleType, EligibilityStatus, ApplicationType } from "@/generated/prisma/enums";
import type { EligibilityTestInput } from "../schemas/eligibility-test-input.schema";

export type ExecutableEligibilityRule = {
  id: string;
  ruleType: RuleType;
  displayOrder: number;
  expectedCondition: unknown;
  required: boolean;
  reviewRequired: boolean;
  missingValueBehavior: RuleOutcome;
  passMessage: string;
  failureMessage: string;
  unknownMessage: string;
  sourceId: string | null;
  sourceLocation: string | null;
  active: boolean;
};

export type EligibilityEvaluationContext = {
  applicationType: ApplicationType;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  checkedAt: string;
};

export type EvaluatedRuleResult = {
  ruleId: string;
  ruleType: RuleType;
  displayOrder: number;
  outcome: RuleOutcome;
  reasonCode: string;
  userValue: string | number | boolean | null;
  expectedValue: unknown;
  approvedMessage: string;
  sourceId: string | null;
  sourceLocation: string | null;
  reviewRequired: boolean;
};

export type EligibilityEvaluation = {
  status: EligibilityStatus;
  ruleResults: EvaluatedRuleResult[];
  executable: boolean;
  executionError: string | null;
};

export type EvaluateEligibilityInput = {
  rules: ExecutableEligibilityRule[];
  input: EligibilityTestInput;
  context: EligibilityEvaluationContext;
};
