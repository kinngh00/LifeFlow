import { z } from "zod";
import { ruleOutcomeSchema } from "./domain-enums.schema";
import { busanDistrictCodeSchema } from "./program-region.schema";

export const eligibilityRuleContentShape = {
  displayOrder: z.number().int().nonnegative(),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  required: z.boolean().default(true),
  reviewRequired: z.boolean().default(false),
  missingValueBehavior: ruleOutcomeSchema.default("UNKNOWN"),
  passMessage: z.string().trim().min(1),
  failureMessage: z.string().trim().min(1),
  unknownMessage: z.string().trim().min(1),
  sourceLocation: z.string().trim().min(1).nullable().optional(),
  active: z.boolean().default(true),
};

const rulePersistenceShape = {
  programVersionId: z.string().min(1),
  sourceId: z.string().min(1).nullable().optional(),
};

export const ageConditionSchema = z
  .object({
    minimumAge: z.number().int().min(0).max(100).optional(),
    maximumAge: z.number().int().min(0).max(100).optional(),
    referenceDate: z.enum(["APPLICATION_DATE", "NOTICE_DATE"]),
  })
  .superRefine((value, context) => {
    if (value.minimumAge === undefined && value.maximumAge === undefined) {
      context.addIssue({
        code: "custom",
        message: "최소 또는 최대 연령 중 하나는 필요합니다.",
      });
    }
    if (
      value.minimumAge !== undefined &&
      value.maximumAge !== undefined &&
      value.minimumAge > value.maximumAge
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumAge"],
        message: "최대 연령은 최소 연령보다 작을 수 없습니다.",
      });
    }
  });

export const regionConditionSchema = z.discriminatedUnion("coverage", [
  z.object({
    coverage: z.literal("NATIONAL"),
    cityCode: z.null().optional(),
    allowedDistrictCodes: z.undefined().optional(),
  }).strict(),
  z.object({
    coverage: z.literal("CITY_WIDE"),
    cityCode: z.literal("26000"),
    allowedDistrictCodes: z.undefined().optional(),
  }).strict(),
  z.object({
    coverage: z.literal("DISTRICT"),
    cityCode: z.literal("26000"),
    allowedDistrictCodes: z.array(busanDistrictCodeSchema).min(1),
  }).strict(),
]);

export const employmentConditionSchema = z.object({
  allowedStatuses: z
    .array(
      z.enum([
        "EMPLOYED",
        "UNEMPLOYED",
        "JOB_SEEKER",
        "SELF_EMPLOYED",
        "FREELANCER",
        "NOT_ECONOMICALLY_ACTIVE",
      ]),
    )
    .min(1),
});

export const studentConditionSchema = z.object({
  allowedStatuses: z
    .array(
      z.enum([
        "ENROLLED",
        "ON_LEAVE",
        "EXPECTED_TO_GRADUATE",
        "GRADUATED",
        "NOT_A_STUDENT",
      ]),
    )
    .min(1),
});

export const incomeBandConditionSchema = z.object({
  allowedBands: z.array(z.string().trim().min(1).max(100)).min(1),
  referenceYear: z.number().int().min(2000).max(2100).optional(),
});

export const housingConditionSchema = z.object({
  allowedHousingTypes: z
    .array(
      z.enum([
        "OWNED",
        "JEONSE",
        "MONTHLY_RENT",
        "PUBLIC_RENTAL",
        "WITH_FAMILY",
        "DORMITORY",
        "OTHER",
      ]),
    )
    .min(1),
  requiresNoHomeOwnership: z.boolean().optional(),
});

export const applicationPeriodConditionSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    path: ["endDate"],
    message: "신청 종료일은 시작일보다 빠를 수 없습니다.",
  });

export const manualReviewConditionSchema = z.object({
  reviewPrompt: z.string().trim().min(1),
  evidenceDescription: z.string().trim().min(1).optional(),
});

export const EligibilityRuleCreateSchema = z
  .discriminatedUnion("ruleType", [
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("AGE"),
      expectedCondition: ageConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("REGION"),
      expectedCondition: regionConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("EMPLOYMENT"),
      expectedCondition: employmentConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("STUDENT"),
      expectedCondition: studentConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("INCOME_BAND"),
      expectedCondition: incomeBandConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("HOUSING"),
      expectedCondition: housingConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("APPLICATION_PERIOD"),
      expectedCondition: applicationPeriodConditionSchema,
    }),
    z.object({
      ...eligibilityRuleContentShape,
      ...rulePersistenceShape,
      ruleType: z.literal("MANUAL_REVIEW"),
      expectedCondition: manualReviewConditionSchema,
    }),
  ])
  .superRefine((value, context) => {
    if (value.ruleType === "MANUAL_REVIEW" && !value.reviewRequired) {
      context.addIssue({
        code: "custom",
        path: ["reviewRequired"],
        message: "수동 확인 규칙은 reviewRequired가 true여야 합니다.",
      });
    }
  });

export type EligibilityRuleCreateInput = z.infer<
  typeof EligibilityRuleCreateSchema
>;
