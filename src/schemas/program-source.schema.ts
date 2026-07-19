import { z } from "zod";
import { sourceTypeSchema } from "./domain-enums.schema";

export const ProgramSourceCreateSchema = z.object({
  programVersionId: z.string().min(1),
  sourceType: sourceTypeSchema,
  organizationName: z.string().trim().min(1).max(200),
  documentTitle: z.string().trim().min(1).max(500),
  sourceUrl: z.string().url(),
  documentIdentifier: z.string().trim().min(1).max(200).nullable().optional(),
  publishedAt: z.iso.date().nullable().optional(),
  checkedAt: z.iso.date(),
  isPrimary: z.boolean().default(false),
  note: z.string().trim().min(1).nullable().optional(),
});

export type ProgramSourceCreateInput = z.infer<
  typeof ProgramSourceCreateSchema
>;
