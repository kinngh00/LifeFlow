import { z } from "zod";
import {
  eligibilityStatusSchema,
  ruleOutcomeSchema,
} from "./domain-enums.schema";

export const ruleTestCaseContentShape = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).nullable().optional(),
  inputSnapshot: z.record(z.string(), z.unknown()),
  expectedOverallStatus: eligibilityStatusSchema,
  expectedRuleOutcomes: z
    .record(z.string(), ruleOutcomeSchema)
    .default({}),
  requiredForPublish: z.boolean().default(true),
};

export const RuleTestCaseCreateSchema = z.object({
  programVersionId: z.string().min(1),
  ...ruleTestCaseContentShape,
  createdById: z.string().min(1),
});

export type RuleTestCaseCreateInput = z.infer<
  typeof RuleTestCaseCreateSchema
>;
