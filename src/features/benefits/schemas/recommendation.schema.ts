import { z } from "zod";
import {
  eligibilityStatusSchema,
  programCategorySchema,
} from "@/schemas/domain-enums.schema";

export const RecommendationFiltersSchema = z
  .object({
    category: programCategorySchema.optional(),
    status: eligibilityStatusSchema.optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(20),
  })
  .strict();

export const RecommendationRequestSchema = z
  .object({ filters: RecommendationFiltersSchema.optional() })
  .strict();

export type RecommendationFilters = z.infer<
  typeof RecommendationFiltersSchema
>;
