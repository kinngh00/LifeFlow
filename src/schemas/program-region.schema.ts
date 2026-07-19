import { z } from "zod";

export const busanDistrictCodeSchema = z.enum([
  "26110", "26140", "26170", "26200", "26230", "26260", "26290", "26320",
  "26350", "26380", "26410", "26440", "26470", "26500", "26530", "26710",
]);

export const commonProgramRegionShape = {
  programVersionId: z.string().min(1),
  reviewRequired: z.boolean().default(false),
  requirementNote: z.string().trim().min(1).nullable().optional(),
};

export const ProgramRegionCreateSchema = z.discriminatedUnion("coverageType", [
  z.object({
    ...commonProgramRegionShape,
    coverageType: z.literal("NATIONAL"),
    cityCode: z.null(),
    districtCode: z.null(),
  }),
  z.object({
    ...commonProgramRegionShape,
    coverageType: z.literal("CITY_WIDE"),
    cityCode: z.literal("26000"),
    districtCode: z.literal("ALL").default("ALL"),
  }),
  z.object({
    ...commonProgramRegionShape,
    coverageType: z.literal("DISTRICT"),
    cityCode: z.literal("26000"),
    districtCode: busanDistrictCodeSchema,
  }),
]).superRefine((value, context) => {
  if (value.reviewRequired && !value.requirementNote) {
    context.addIssue({
      code: "custom",
      path: ["requirementNote"],
      message: "추가 확인이 필요한 지역 조건에는 확인 메모가 필요합니다.",
    });
  }
});

export type ProgramRegionCreateInput = z.infer<
  typeof ProgramRegionCreateSchema
>;
