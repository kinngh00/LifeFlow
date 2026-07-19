import { z } from "zod";

const EntityIdSchema = z.string().trim().min(1).max(64);

export const PublishProgramVersionSchema = z
  .object({
    programVersionId: EntityIdSchema,
    publishedById: EntityIdSchema,
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type PublishProgramVersionInput = z.infer<typeof PublishProgramVersionSchema>;

export const CreateDraftVersionFromPublishedSchema = z
  .object({
    programId: EntityIdSchema,
    createdById: EntityIdSchema,
    sourceVersionId: EntityIdSchema.optional(),
  })
  .strict();

export type CreateDraftVersionFromPublishedInput = z.infer<
  typeof CreateDraftVersionFromPublishedSchema
>;
