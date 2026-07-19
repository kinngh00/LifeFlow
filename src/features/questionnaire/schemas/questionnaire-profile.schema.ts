import { z } from "zod";
import { programCategorySchema } from "@/schemas/domain-enums.schema";

const unknownable = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("UNKNOWN")]);

const employmentStatusSchema = z.enum([
  "EMPLOYED",
  "UNEMPLOYED",
  "JOB_SEEKER",
  "SELF_EMPLOYED",
  "FREELANCER",
  "NOT_ECONOMICALLY_ACTIVE",
]);

export const QuestionnaireProfileDraftSchema = z
  .object({
    birthDate: unknownable(z.iso.date()).optional(),
    residenceCityCode: unknownable(z.string().regex(/^\d{5}$/)).optional(),
    residenceDistrictCode: z
      .union([z.string().regex(/^\d{5}$/), z.literal("UNKNOWN"), z.null()])
      .optional(),
    interestedCategories: z.array(programCategorySchema).min(1).max(2).optional(),
    employmentStatus: unknownable(employmentStatusSchema).optional(),
    jobSeekingStatus: unknownable(z.enum(["YES", "NO"])).optional(),
    studentStatus: unknownable(
      z.enum([
        "ENROLLED",
        "ON_LEAVE",
        "EXPECTED_TO_GRADUATE",
        "GRADUATED",
        "NOT_A_STUDENT",
      ]),
    ).optional(),
    householdSize: unknownable(z.number().int().min(1).max(20)).optional(),
    incomeBand: unknownable(z.string().trim().min(1).max(100)).optional(),
    housingType: unknownable(
      z.enum([
        "OWNED",
        "JEONSE",
        "MONTHLY_RENT",
        "PUBLIC_RENTAL",
        "WITH_FAMILY",
        "DORMITORY",
        "OTHER",
      ]),
    ).optional(),
    homeOwnershipStatus: unknownable(z.enum(["OWNS_HOME", "NO_HOME"])).optional(),
    householdHeadStatus: unknownable(z.enum(["HEAD", "MEMBER"])).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.birthDate &&
      value.birthDate !== "UNKNOWN" &&
      (value.birthDate < "1900-01-01" || value.birthDate > new Date().toISOString().slice(0, 10))
    ) {
      context.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "생년월일은 1900년 이후의 과거 날짜여야 합니다.",
      });
    }
    if (
      value.residenceCityCode &&
      value.residenceCityCode !== "26000" &&
      value.residenceDistrictCode &&
      value.residenceDistrictCode !== "UNKNOWN"
    ) {
      context.addIssue({
        code: "custom",
        path: ["residenceDistrictCode"],
        message: "부산 외 지역은 구·군을 입력하지 않습니다.",
      });
    }
  });

export const QuestionnaireProfileSchema = QuestionnaireProfileDraftSchema.safeExtend({
  interestedCategories: z.array(programCategorySchema).min(1).max(2),
});

export const QuestionnaireSessionUpdateSchema = QuestionnaireProfileDraftSchema;

export type QuestionnaireProfileDraft = z.infer<
  typeof QuestionnaireProfileDraftSchema
>;
export type QuestionnaireProfile = z.infer<typeof QuestionnaireProfileSchema>;
