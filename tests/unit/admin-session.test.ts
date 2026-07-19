import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createAdminSession, validateAdminSession } from "@/features/admin/auth/services/admin-auth.service";
import { generateAdminSessionToken, hashAdminSessionToken } from "@/server/auth/session-token";

const now = new Date("2026-07-19T00:00:00.000Z");

function validationDatabase(overrides: { expiresAt?: Date; revokedAt?: Date | null; active?: boolean }) {
  return {
    adminSession: {
      findUnique: async () => ({
        id: "session-1",
        expiresAt: overrides.expiresAt ?? new Date("2026-07-20T00:00:00.000Z"),
        revokedAt: overrides.revokedAt ?? null,
        lastUsedAt: now,
        adminUser: { id: "admin-1", email: "admin@example.com", displayName: "관리자", active: overrides.active ?? true },
      }),
      update: async () => ({}),
    },
  } as unknown as PrismaClient;
}

describe("admin session", () => {
  it("충분한 길이의 난수 토큰을 생성한다", () => {
    expect(generateAdminSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("DB에는 원본 토큰이 아닌 hash를 저장한다", async () => {
    let storedHash = "";
    const database = {
      adminUser: { findUnique: async () => ({ active: true }) },
      adminSession: { create: async ({ data }: { data: { tokenHash: string } }) => { storedHash = data.tokenHash; return {}; } },
    } as unknown as PrismaClient;
    const session = await createAdminSession("admin-1", database, now);
    expect(storedHash).toBe(hashAdminSessionToken(session.token));
    expect(storedHash).not.toBe(session.token);
  });

  it("동일한 토큰 hash는 일관된다", () => {
    const token = generateAdminSessionToken();
    expect(hashAdminSessionToken(token)).toBe(hashAdminSessionToken(token));
  });

  it("만료 세션을 거부한다", async () => {
    await expect(validateAdminSession("token", validationDatabase({ expiresAt: now }), now)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("폐기 세션을 거부한다", async () => {
    await expect(validateAdminSession("token", validationDatabase({ revokedAt: now }), now)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("비활성 관리자 세션을 거부한다", async () => {
    await expect(validateAdminSession("token", validationDatabase({ active: false }), now)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });
});
