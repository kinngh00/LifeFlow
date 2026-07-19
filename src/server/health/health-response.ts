import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  getDegradedHealthStatus,
  getHealthStatus,
} from "@/server/services/health.service";

export async function createHealthResponse(
  database?: PrismaClient,
): Promise<Response> {
  try {
    return Response.json(await getHealthStatus(database));
  } catch {
    return Response.json(getDegradedHealthStatus(), { status: 503 });
  }
}
