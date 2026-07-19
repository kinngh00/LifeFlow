import { z } from "zod";

export const commonProgramRegionShape = {
  programVersionId: z.string().min(1),
  cityCode: z.literal("26000"),
  reviewRequired: z.boolean().default(false),
  requirementNote: z.string().trim().min(1).nullable().optional(),
};

export const ProgramRegionCreateSchema = z.discriminatedUnion("coverageType", [
  z.object({
    ...commonProgramRegionShape,
    coverageType: z.literal("CITY_WIDE"),
    districtCode: z.literal("ALL").default("ALL"),
  }),
  z.object({
    ...commonProgramRegionShape,
    coverageType: z.literal("DISTRICT"),
    districtCode: z.string().regex(/^26\d{3}$/),
  }),
]);

export type ProgramRegionCreateInput = z.infer<
  typeof ProgramRegionCreateSchema
>;
