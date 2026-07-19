import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { validateAdminSession } from "@/features/admin/auth/services/admin-auth.service";
import type { ValidatedAdminSession } from "@/features/admin/auth/types/admin-auth.types";
import { readAdminSessionCookie } from "@/server/cookies/admin-session-cookie";

export function requireAdminSession(
  request: Request,
  database?: PrismaClient,
): Promise<ValidatedAdminSession> {
  return validateAdminSession(readAdminSessionCookie(request) ?? "", database);
}
