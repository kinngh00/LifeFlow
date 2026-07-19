import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createDatabaseClient(connectionString: string, options: { maxConnections?: number } = {}): PrismaClient {
  const adapter = new PrismaPg({ connectionString, ...(options.maxConnections === undefined ? {} : { max: options.maxConnections }) });
  return new PrismaClient({ adapter });
}
