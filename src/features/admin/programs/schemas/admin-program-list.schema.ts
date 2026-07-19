import { z } from "zod";
import {
  programCategorySchema,
  publicationStatusSchema,
} from "@/schemas/domain-enums.schema";

export const AdminProgramListQuerySchema = z
  .object({
    category: programCategorySchema.optional(),
    publicationStatus: publicationStatusSchema.optional(),
    includeArchived: z.boolean().default(false),
    search: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminProgramListQuery = z.input<
  typeof AdminProgramListQuerySchema
>;
export type ParsedAdminProgramListQuery = z.output<
  typeof AdminProgramListQuerySchema
>;
