import type { PrismaClient } from "@/generated/prisma/client";
import { createDatabaseClient } from "@/server/db/client";
import { assertSafeTestDatabaseUrl } from "@/server/db/test-database-url";

let testDatabase: PrismaClient | undefined;

export function getTestDatabase(): PrismaClient {
  if (!testDatabase) {
    const connectionString = assertSafeTestDatabaseUrl({
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
      databaseUrl: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    });
    testDatabase = createDatabaseClient(connectionString, { maxConnections: 1 });
  }

  return testDatabase;
}

export async function disconnectTestDatabase(): Promise<void> {
  await testDatabase?.$disconnect();
  testDatabase = undefined;
}

export function uniqueTestValue(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
