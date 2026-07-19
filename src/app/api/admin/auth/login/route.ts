import { NextResponse } from "next/server";
import { loginAdmin } from "@/features/admin/auth/services/admin-auth.service";
import { AdminLoginSchema } from "@/features/admin/auth/schemas/admin-auth.schema";
import { setAdminSessionCookie } from "@/server/cookies/admin-session-cookie";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { DomainError } from "@/server/errors/domain-error";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";
import {
  assertLoginAttemptAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/server/auth/login-rate-limit";

export async function POST(request: Request): Promise<Response> {
  let normalizedEmail: string | undefined;
  try {
    assertSafeAdminMutationRequest(request);
    const input = await parseJsonRequest(request, AdminLoginSchema);
    normalizedEmail = input.email;
    assertLoginAttemptAllowed(input.email, request);
    const result = await loginAdmin(input);
    clearLoginFailures(input.email, request);
    const response = NextResponse.json({
      admin: result.admin,
      expiresAt: result.expiresAt,
    });
    setAdminSessionCookie(response, result.token, new Date(result.expiresAt));
    return response;
  } catch (error) {
    if (
      normalizedEmail &&
      error instanceof DomainError &&
      error.code === "AUTHENTICATION_FAILED"
    ) {
      recordLoginFailure(normalizedEmail, request);
    }
    return toErrorResponse(error);
  }
}
