import { z } from "zod";
import { programCategorySchema } from "./domain-enums.schema";

export const ProgramCreateSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: programCategorySchema,
    managingOrganization: z.string().trim().min(1).max(200),
    operatingOrganization: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .nullable()
      .optional(),
    createdById: z.string().min(1),
  })
  .strict();

export type ProgramCreateInput = z.infer<typeof ProgramCreateSchema>;
