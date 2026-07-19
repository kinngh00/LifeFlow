import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/server/env/server-env";
import { createDatabaseClient } from "./create-database-client";
import { assertSafeTestDatabaseUrl } from "./test-database-url";

export { createDatabaseClient } from "./create-database-client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDatabaseClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const { DATABASE_URL, DIRECT_URL, TEST_DATABASE_URL } = getServerEnv();
  const connectionString =
    process.env.NODE_ENV === "test" && TEST_DATABASE_URL
      ? assertSafeTestDatabaseUrl({
          testDatabaseUrl: TEST_DATABASE_URL,
          databaseUrl: DATABASE_URL,
          directUrl: DIRECT_URL,
        })
      : DATABASE_URL;
  const client = createDatabaseClient(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
