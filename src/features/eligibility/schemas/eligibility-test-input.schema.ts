import { z } from "zod";

const nullableUnknown = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("UNKNOWN"), z.null()]).optional();

export const EligibilityTestInputSchema = z
  .object({
    birthDate: nullableUnknown(z.iso.date()),
    residenceCityCode: nullableUnknown(z.string().regex(/^\d{5}$/)),
    residenceDistrictCode: nullableUnknown(z.string().regex(/^\d{5}$/)),
    employmentStatus: nullableUnknown(
      z.enum(["EMPLOYED", "UNEMPLOYED", "JOB_SEEKER", "SELF_EMPLOYED", "FREELANCER", "NOT_ECONOMICALLY_ACTIVE"]),
    ),
    studentStatus: nullableUnknown(
      z.enum(["ENROLLED", "ON_LEAVE", "EXPECTED_TO_GRADUATE", "GRADUATED", "NOT_A_STUDENT"]),
    ),
    incomeBand: nullableUnknown(z.string().trim().min(1).max(100)),
    housingType: nullableUnknown(
      z.enum(["OWNED", "JEONSE", "MONTHLY_RENT", "PUBLIC_RENTAL", "WITH_FAMILY", "DORMITORY", "OTHER"]),
    ),
    homeOwnershipStatus: nullableUnknown(z.enum(["OWNS_HOME", "NO_HOME"])),
    householdHeadStatus: nullableUnknown(z.enum(["HEAD", "MEMBER"])),
    evaluationDate: z.iso.date(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      typeof value.birthDate === "string" &&
      value.birthDate !== "UNKNOWN" &&
      value.birthDate > value.evaluationDate
    ) {
      context.addIssue({ code: "custom", path: ["birthDate"], message: "생년월일은 평가일보다 미래일 수 없습니다." });
    }
  });

export type EligibilityTestInput = z.infer<typeof EligibilityTestInputSchema>;
