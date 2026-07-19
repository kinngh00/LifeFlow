import "server-only";

import type { NextResponse } from "next/server";
import { ADMIN_SESSION_TTL_MS } from "@/server/auth/session-token";

export const ADMIN_SESSION_COOKIE_NAME = "lifeflow_admin_session";

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function setAdminSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    ...adminSessionCookieOptions,
    expires: expiresAt,
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...adminSessionCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function readAdminSessionCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...valueParts] = pair.trim().split("=");
    if (name === ADMIN_SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return undefined;
}
