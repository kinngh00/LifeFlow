import { z } from "zod";
import { eligibilityStatusSchema } from "./domain-enums.schema";

export { eligibilityStatusSchema };

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type EligibilityStatus = z.infer<typeof eligibilityStatusSchema>;
