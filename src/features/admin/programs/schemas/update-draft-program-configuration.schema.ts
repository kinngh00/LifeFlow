import { z } from "zod";
import {
  ageConditionSchema,
  applicationPeriodConditionSchema,
  eligibilityRuleContentShape,
  employmentConditionSchema,
  housingConditionSchema,
  incomeBandConditionSchema,
  manualReviewConditionSchema,
  regionConditionSchema,
  studentConditionSchema,
} from "@/schemas/eligibility-rule.schema";
import { eligibilityStatusSchema, ruleOutcomeSchema } from "@/schemas/domain-enums.schema";
import { commonProgramRegionShape } from "@/schemas/program-region.schema";
import { ProgramSourceCreateSchema } from "@/schemas/program-source.schema";
import { BUSAN_CITY_CODE } from "../validators/busan-region.constants";

const httpUrlSchema = z
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "출처 URL은 HTTP 또는 HTTPS여야 합니다.",
  });

export const DraftProgramSourceInputSchema = ProgramSourceCreateSchema.omit({
  programVersionId: true,
})
  .extend({ sourceUrl: httpUrlSchema })
  .strict();

export const DraftProgramRegionInputSchema = z.discriminatedUnion(
  "coverageType",
  [
    z.object({
      cityCode: commonProgramRegionShape.cityCode,
      reviewRequired: commonProgramRegionShape.reviewRequired,
      requirementNote: commonProgramRegionShape.requirementNote,
      coverageType: z.literal("CITY_WIDE"),
      districtCode: z.literal("ALL").default("ALL"),
    }).strict(),
    z.object({
      cityCode: commonProgramRegionShape.cityCode,
      reviewRequired: commonProgramRegionShape.reviewRequired,
      requirementNote: commonProgramRegionShape.requirementNote,
      coverageType: z.literal("DISTRICT"),
      districtCode: z.string().regex(/^26\d{3}$/),
    }).strict(),
  ],
);

const draftRuleCommonShape = {
  ...eligibilityRuleContentShape,
  displayOrder: z.number().int().min(1),
  sourceLocation: z.string().trim().min(1).max(500),
  sourceReference: z.object({ sourceIndex: z.number().int().nonnegative() }).strict(),
};

export const DraftEligibilityRuleInputSchema = z
  .discriminatedUnion("ruleType", [
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("AGE"), expectedCondition: ageConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("REGION"), expectedCondition: regionConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("EMPLOYMENT"), expectedCondition: employmentConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("STUDENT"), expectedCondition: studentConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("INCOME_BAND"), expectedCondition: incomeBandConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("HOUSING"), expectedCondition: housingConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("APPLICATION_PERIOD"), expectedCondition: applicationPeriodConditionSchema }).strict(),
    z.object({ ...draftRuleCommonShape, ruleType: z.literal("MANUAL_REVIEW"), expectedCondition: manualReviewConditionSchema }).strict(),
  ])
  .superRefine((value, context) => {
    if (value.ruleType === "MANUAL_REVIEW" && !value.reviewRequired) {
      context.addIssue({ code: "custom", path: ["reviewRequired"], message: "수동 확인 규칙은 reviewRequired가 true여야 합니다." });
    }
  });

export const DraftRuleTestCaseInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).nullable().optional(),
    inputSnapshot: z.record(z.string(), z.unknown()),
    expectedOverallStatus: eligibilityStatusSchema,
    expectedRuleOutcomes: z
      .array(
        z.object({
          displayOrder: z.number().int().min(1),
          outcome: ruleOutcomeSchema,
        }).strict(),
      )
      .min(1),
    requiredForPublish: z.boolean().default(true),
  })
  .strict();

export const UpdateDraftProgramConfigurationSchema = z
  .object({
    programVersionId: z.string().trim().min(1),
    updatedById: z.string().trim().min(1),
    sources: z.array(DraftProgramSourceInputSchema).min(1).max(30),
    regions: z.array(DraftProgramRegionInputSchema).min(1).max(20),
    rules: z.array(DraftEligibilityRuleInputSchema).min(1).max(50),
    testCases: z.array(DraftRuleTestCaseInputSchema).min(1).max(50),
  })
  .strict();

export type UpdateDraftProgramConfigurationInput = z.input<
  typeof UpdateDraftProgramConfigurationSchema
>;
export type ParsedDraftProgramConfiguration = z.output<
  typeof UpdateDraftProgramConfigurationSchema
>;

export { BUSAN_CITY_CODE };
