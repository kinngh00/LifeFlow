import { NextResponse } from "next/server";
import { revokeAdminSession } from "@/features/admin/auth/services/admin-auth.service";
import {
  clearAdminSessionCookie,
  readAdminSessionCookie,
} from "@/server/cookies/admin-session-cookie";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    await revokeAdminSession(readAdminSessionCookie(request));
    const response = NextResponse.json({ success: true });
    clearAdminSessionCookie(response);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
