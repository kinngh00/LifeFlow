import { z } from "zod";

export const RunProgramVersionTestsSchema = z
  .object({
    programVersionId: z.string().trim().min(1),
    executedById: z.string().trim().min(1),
  })
  .strict();

export const ProgramVersionPublicationReadinessSchema = z
  .object({ programVersionId: z.string().trim().min(1) })
  .strict();

export type RunProgramVersionTestsInput = z.infer<typeof RunProgramVersionTestsSchema>;
export type ProgramVersionPublicationReadinessInput = z.infer<
  typeof ProgramVersionPublicationReadinessSchema
>;
