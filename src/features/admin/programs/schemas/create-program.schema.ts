import { z } from "zod";
import { ProgramCreateSchema } from "@/schemas/program.schema";
import { ProgramVersionContentSchema } from "@/schemas/program-version.schema";

export const CreateProgramWithInitialVersionSchema = z
  .object({
    program: ProgramCreateSchema.omit({ createdById: true }),
    version: ProgramVersionContentSchema,
    createdById: z.string().min(1),
  })
  .strict();

export type CreateProgramWithInitialVersionInput = z.input<
  typeof CreateProgramWithInitialVersionSchema
>;
export type ParsedCreateProgramWithInitialVersionInput = z.output<
  typeof CreateProgramWithInitialVersionSchema
>;
