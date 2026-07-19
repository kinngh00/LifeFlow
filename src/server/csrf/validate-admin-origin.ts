import "server-only";

import { DomainError } from "@/server/errors/domain-error";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getAllowedApplicationOrigin(): string {
  const configured = process.env.APP_ORIGIN;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new DomainError("INTERNAL_ERROR", "허용된 애플리케이션 Origin이 설정되지 않았습니다.");
  }
  try {
    return new URL(configured ?? "http://localhost:3000").origin;
  } catch {
    throw new DomainError("INTERNAL_ERROR", "허용된 애플리케이션 Origin 설정이 올바르지 않습니다.");
  }
}

export function assertSafeAdminMutationRequest(request: Request): void {
  if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) return;
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new DomainError("VALIDATION_ERROR", "관리자 상태 변경 요청은 JSON 형식이어야 합니다.");
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== getAllowedApplicationOrigin()) {
    throw new DomainError("CSRF_VALIDATION_FAILED", "요청 출처를 확인할 수 없습니다.");
  }
}
