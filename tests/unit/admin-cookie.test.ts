import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { adminSessionCookieOptions, clearAdminSessionCookie, setAdminSessionCookie } from "@/server/cookies/admin-session-cookie";

describe("admin session cookie", () => {
  it("HttpOnly로 설정한다", () => {
    const response = NextResponse.json({});
    setAdminSessionCookie(response, "token", new Date("2030-01-01"));
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("운영 환경에서는 Secure 정책을 사용한다", () => {
    expect(adminSessionCookieOptions.secure).toBe(process.env.NODE_ENV === "production");
  });

  it("삭제 쿠키는 Max-Age=0으로 만료한다", () => {
    const response = NextResponse.json({});
    clearAdminSessionCookie(response);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("Path=/와 SameSite=Strict를 사용한다", () => {
    const response = NextResponse.json({});
    setAdminSessionCookie(response, "token", new Date("2030-01-01"));
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
  });
});
