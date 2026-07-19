import { describe, expect, it } from "vitest";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";

function request(method: string, origin?: string) {
  return new Request("http://localhost:3000/api/admin/test", {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      ...(method === "GET" ? {} : { "content-type": "application/json" }),
    },
  });
}

describe("admin request origin", () => {
  it("허용 origin을 통과시킨다", () => expect(() => assertSafeAdminMutationRequest(request("POST", "http://localhost:3000"))).not.toThrow());
  it("다른 origin을 거부한다", () => expect(() => assertSafeAdminMutationRequest(request("POST", "https://evil.example"))).toThrow(expect.objectContaining({ code: "CSRF_VALIDATION_FAILED" })));
  it("상태 변경 요청의 origin 누락을 거부한다", () => expect(() => assertSafeAdminMutationRequest(request("PATCH"))).toThrow(expect.objectContaining({ code: "CSRF_VALIDATION_FAILED" })));
  it("GET은 CSRF 검사 대상에서 제외한다", () => expect(() => assertSafeAdminMutationRequest(request("GET"))).not.toThrow());
});
