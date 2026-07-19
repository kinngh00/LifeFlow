import { randomBytes, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { hashAdminPassword } from "@/server/auth/password-core";
import { assertSafeTestDatabaseUrl } from "@/server/db/test-database-url";

export default async function globalSetup() {
  const connectionString = assertSafeTestDatabaseUrl({
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  });
  const email =
    process.env.E2E_ADMIN_EMAIL ?? `e2e-${Date.now()}@lifeflow.test`;
  const password =
    process.env.E2E_ADMIN_PASSWORD ??
    `LifeFlow-e2e-${randomBytes(18).toString("base64url")}`;
  if (!email.startsWith("e2e-") || !email.endsWith("@lifeflow.test")) {
    throw new Error(
      "E2E_ADMIN_EMAIL은 e2e- 접두어와 @lifeflow.test 도메인을 사용해야 합니다.",
    );
  }

  let id: string = randomUUID();
  const client = new Client({ connectionString, connectionTimeoutMillis: 3_000 });

  await client.connect();
  try {
    const migrationNames = (
      await readdir(path.join(process.cwd(), "prisma", "migrations"), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const migrationResult = await client.query<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>(
      'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
    );
    const appliedMigrations = new Set(
      migrationResult.rows
        .filter((row) => row.finished_at && !row.rolled_back_at)
        .map((row) => row.migration_name),
    );
    const missingMigrations = migrationNames.filter(
      (migrationName) => !appliedMigrations.has(migrationName),
    );
    if (missingMigrations.length > 0) {
      throw new Error(
        `E2E 테스트 DB에 적용되지 않은 마이그레이션이 있습니다: ${missingMigrations.join(", ")}`,
      );
    }

    const adminResult = await client.query<{ id: string }>(
      'INSERT INTO "AdminUser" ("id","email","passwordHash","displayName","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,true,now(),now()) ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "displayName" = EXCLUDED."displayName", "active" = true, "updatedAt" = now() RETURNING "id"',
      [id, email, await hashAdminPassword(password), "E2E 관리자"],
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      throw new Error("E2E 임시 관리자 생성 결과를 확인할 수 없습니다.");
    }
    id = admin.id;
  } finally {
    await client.end();
  }

  process.env.E2E_ADMIN_ID = id;
  process.env.E2E_ADMIN_EMAIL = email;
  process.env.E2E_ADMIN_PASSWORD = password;
}
