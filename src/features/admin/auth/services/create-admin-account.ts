import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { hashAdminPassword } from "@/server/auth/password-core";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  CreateAdminAccountSchema,
  type CreateAdminAccountInput,
} from "../schemas/create-admin-account.schema";

export type CreatedAdminAccount = {
  id: string;
  email: string;
  displayName: string;
  active: true;
  createdAt: string;
};

export async function createAdminAccount(
  input: CreateAdminAccountInput,
  database: PrismaClient,
): Promise<CreatedAdminAccount> {
  const parsed = parseOrThrow(CreateAdminAccountSchema, input);

  try {
    const existing = await database.adminUser.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existing) {
      throw new DomainError("ADMIN_EMAIL_CONFLICT", "이미 등록된 관리자 이메일입니다.");
    }

    const passwordHash = await hashAdminPassword(parsed.password);
    const created = await database.adminUser.create({
      data: {
        email: parsed.email,
        displayName: parsed.displayName,
        passwordHash,
        active: true,
      },
      select: { id: true, email: true, displayName: true, active: true, createdAt: true },
    });

    return {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      active: true,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DomainError("ADMIN_EMAIL_CONFLICT", "이미 등록된 관리자 이메일입니다.");
    }
    throw toDatabaseDomainError(error);
  }
}
