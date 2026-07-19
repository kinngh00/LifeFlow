import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import { hashAdminPassword, verifyAdminPassword } from "@/server/auth/password";
import {
  ADMIN_SESSION_TOUCH_INTERVAL_MS,
  ADMIN_SESSION_TTL_MS,
  generateAdminSessionToken,
  hashAdminSessionToken,
} from "@/server/auth/session-token";
import { AdminLoginSchema, type AdminLoginInput } from "../schemas/admin-auth.schema";
import type {
  CreatedAdminSession,
  PublicAdmin,
  ValidatedAdminSession,
} from "../types/admin-auth.types";

const dummyPasswordHash = hashAdminPassword("LifeFlow-dummy-password-only");
const AUTHENTICATION_MESSAGE = "이메일 또는 비밀번호를 확인해 주세요.";

function publicAdmin(admin: { id: string; email: string; displayName: string }): PublicAdmin {
  return { id: admin.id, email: admin.email, displayName: admin.displayName };
}

export async function authenticateAdmin(
  input: AdminLoginInput,
  database: PrismaClient = getDatabaseClient(),
): Promise<PublicAdmin> {
  const parsed = parseOrThrow(AdminLoginSchema, input);
  try {
    const admin = await database.adminUser.findUnique({
      where: { email: parsed.email },
      select: { id: true, email: true, displayName: true, passwordHash: true, active: true },
    });
    const passwordValid = await verifyAdminPassword(
      parsed.password,
      admin?.passwordHash ?? (await dummyPasswordHash),
    );
    if (!admin || !admin.active || !passwordValid) {
      throw new DomainError("AUTHENTICATION_FAILED", AUTHENTICATION_MESSAGE);
    }
    return publicAdmin(admin);
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}

export async function createAdminSession(
  adminId: string,
  database: PrismaClient = getDatabaseClient(),
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateAdminSessionToken();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_MS);
  try {
    const admin = await database.adminUser.findUnique({ where: { id: adminId }, select: { active: true } });
    if (!admin?.active) throw new DomainError("AUTHENTICATION_FAILED", AUTHENTICATION_MESSAGE);
    await database.adminSession.create({
      data: { adminUserId: adminId, tokenHash: hashAdminSessionToken(token), expiresAt, lastUsedAt: now },
    });
    return { token, expiresAt };
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}

export async function loginAdmin(
  input: AdminLoginInput,
  database: PrismaClient = getDatabaseClient(),
): Promise<CreatedAdminSession> {
  const admin = await authenticateAdmin(input, database);
  const session = await createAdminSession(admin.id, database);
  await database.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return { admin, token: session.token, expiresAt: session.expiresAt.toISOString() };
}

export async function validateAdminSession(
  token: string,
  database: PrismaClient = getDatabaseClient(),
  now = new Date(),
): Promise<ValidatedAdminSession> {
  if (!token) throw new DomainError("SESSION_INVALID", "관리자 인증이 필요합니다.");
  try {
    const session = await database.adminSession.findUnique({
      where: { tokenHash: hashAdminSessionToken(token) },
      include: { adminUser: { select: { id: true, email: true, displayName: true, active: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now || !session.adminUser.active) {
      throw new DomainError("SESSION_INVALID", "관리자 인증이 필요합니다.");
    }
    if (now.getTime() - session.lastUsedAt.getTime() >= ADMIN_SESSION_TOUCH_INTERVAL_MS) {
      await database.adminSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });
    }
    return { sessionId: session.id, admin: publicAdmin(session.adminUser), expiresAt: session.expiresAt.toISOString() };
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}

export async function revokeAdminSession(
  token: string | undefined,
  database: PrismaClient = getDatabaseClient(),
  now = new Date(),
): Promise<void> {
  if (!token) return;
  try {
    await database.adminSession.updateMany({
      where: { tokenHash: hashAdminSessionToken(token), revokedAt: null },
      data: { revokedAt: now },
    });
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
