import { z } from "zod";
import { CreateProgramWithInitialVersionSchema } from "./create-program.schema";
import { UpdateDraftProgramConfigurationSchema } from "./update-draft-program-configuration.schema";
import {
  CreateDraftVersionFromPublishedSchema,
  PublishProgramVersionSchema,
} from "./program-publication.schema";

export const CreateAdminProgramBodySchema = CreateProgramWithInitialVersionSchema.omit({
  createdById: true,
});

export const UpdateDraftProgramConfigurationBodySchema =
  UpdateDraftProgramConfigurationSchema.omit({
    programVersionId: true,
    updatedById: true,
  });

export const RunProgramVersionTestsBodySchema = z.object({}).strict();

export const PublishProgramVersionBodySchema = PublishProgramVersionSchema.pick({
  reason: true,
});

export const CreateDraftVersionBodySchema = CreateDraftVersionFromPublishedSchema.pick({
  sourceVersionId: true,
});
