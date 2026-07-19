import { describe, expect, it } from "vitest";
import { DomainError, getDomainErrorHttpStatus } from "@/server/errors/domain-error";
import { toErrorResponse } from "@/server/errors/error-response";

describe("HTTP error response", () => {
  it("주요 DomainError 상태 코드를 매핑한다", () => {
    expect(getDomainErrorHttpStatus("VALIDATION_ERROR")).toBe(400);
    expect(getDomainErrorHttpStatus("SESSION_INVALID")).toBe(401);
    expect(getDomainErrorHttpStatus("PROGRAM_SLUG_CONFLICT")).toBe(409);
    expect(getDomainErrorHttpStatus("DATABASE_UNAVAILABLE")).toBe(503);
  });

  it("알 수 없는 내부 오류에서 민감정보를 제거한다", async () => {
    const response = toErrorResponse(new Error("postgresql://user:secret@localhost/db"));
    expect(await response.text()).not.toContain("secret");
    expect(response.status).toBe(500);
  });

  it("로그인 실패는 동일한 외부 코드와 메시지를 사용한다", async () => {
    const response = toErrorResponse(new DomainError("AUTHENTICATION_FAILED", "이메일 또는 비밀번호를 확인해 주세요."));
    expect(await response.json()).toMatchObject({ error: { code: "AUTHENTICATION_FAILED", message: "이메일 또는 비밀번호를 확인해 주세요." } });
    expect(response.status).toBe(401);
  });
});
