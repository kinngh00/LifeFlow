import "server-only";

import { DomainError } from "@/server/errors/domain-error";
import { getAllowedApplicationOrigin } from "./validate-admin-origin";

export function assertSafePublicMutationRequest(request: Request): void {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new DomainError("VALIDATION_ERROR", "요청은 JSON 형식이어야 합니다.");
  }
  if (request.headers.get("origin") !== getAllowedApplicationOrigin()) {
    throw new DomainError("CSRF_VALIDATION_FAILED", "요청 출처를 확인할 수 없습니다.");
  }
}
