import "server-only";

import { AppError } from "./app-error";
import { DomainError, getDomainErrorHttpStatus } from "./domain-error";
import type { ApiErrorPayload } from "@/types/api";

export function toErrorResponse(error: unknown): Response {
  const requestId = crypto.randomUUID();
  const appError = error instanceof AppError;
  const domainError = error instanceof DomainError;
  const payload: ApiErrorPayload = {
    error: {
      code: domainError
        ? error.code
        : appError
          ? error.code
          : "INTERNAL_ERROR",
      message:
        domainError || appError
          ? error.message
          : "요청을 처리하는 중 예상하지 못한 오류가 발생했습니다.",
      requestId,
      ...((domainError || appError) && error.details !== undefined
        ? { details: error.details }
        : {}),
    },
  };

  const status = domainError
    ? getDomainErrorHttpStatus(error.code)
    : appError
      ? error.status
      : 500;

  return Response.json(payload, { status });
}
