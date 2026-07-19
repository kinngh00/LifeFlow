import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";

export type ConnectedHealthStatus = {
  status: "ok";
  database: "connected";
  timestamp: string;
};

export type DegradedHealthStatus = {
  status: "degraded";
  database: "unavailable";
  timestamp: string;
};

export async function getHealthStatus(
  database: PrismaClient = getDatabaseClient(),
): Promise<ConnectedHealthStatus> {
  try {
    const rows = await database.$queryRaw<Array<{ result: number }>>`
      SELECT 1 AS result
    `;

    if (rows[0]?.result !== 1) {
      throw new Error("Unexpected health query result");
    }
  } catch (error) {
    throw new DomainError(
      "DATABASE_UNAVAILABLE",
      "데이터베이스를 사용할 수 없습니다.",
      undefined,
      { cause: error },
    );
  }

  return {
    status: "ok",
    database: "connected",
    timestamp: new Date().toISOString(),
  };
}

export function getDegradedHealthStatus(): DegradedHealthStatus {
  return {
    status: "degraded",
    database: "unavailable",
    timestamp: new Date().toISOString(),
  };
}
