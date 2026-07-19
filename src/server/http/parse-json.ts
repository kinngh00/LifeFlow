import "server-only";

import type { z } from "zod";
import { DomainError } from "@/server/errors/domain-error";
import { parseOrThrow } from "@/server/errors/validation-error";

export async function parseJsonRequest<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("VALIDATION_ERROR", "올바른 JSON 요청 본문이 필요합니다.");
  }
  return parseOrThrow(schema, body);
}
