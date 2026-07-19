import type { z } from "zod";
import { DomainError } from "./domain-error";

export function parseOrThrow<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "입력값이 올바르지 않습니다.",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
