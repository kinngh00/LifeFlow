import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/server/env/server-env";
import { createDatabaseClient } from "./create-database-client";

export { createDatabaseClient } from "./create-database-client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDatabaseClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const { DATABASE_URL } = getServerEnv();
  const client = createDatabaseClient(DATABASE_URL);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
