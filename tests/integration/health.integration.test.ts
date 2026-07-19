import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/server/db/client";
import { createHealthResponse } from "@/server/health/health-response";
import { getHealthStatus } from "@/server/services/health.service";
import {
  disconnectTestDatabase,
  getTestDatabase,
} from "./helpers/database";

describe("database health", () => {
  afterAll(disconnectTestDatabase);

  it("실제 DB 쿼리 성공 시 connected를 반환한다", async () => {
    const result = await getHealthStatus(getTestDatabase());

    expect(result.status).toBe("ok");
    expect(result.database).toBe("connected");
  });

  it("사용할 수 없는 DB 연결에서는 HTTP 503과 unavailable을 반환한다", async () => {
    const unavailable = createDatabaseClient(
      "postgresql://invalid:invalid@127.0.0.1:59999/lifeflow_test?connect_timeout=1",
    );

    try {
      const response = await createHealthResponse(unavailable);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        status: "degraded",
        database: "unavailable",
      });
    } finally {
      await unavailable.$disconnect();
    }
  });

  it("오류 응답에 비밀번호와 DATABASE_URL을 포함하지 않는다", async () => {
    const password = "never-expose-this-password";
    const unavailable = createDatabaseClient(
      `postgresql://invalid:${password}@127.0.0.1:59998/lifeflow_test?connect_timeout=1`,
    );

    try {
      const response = await createHealthResponse(unavailable);
      const serialized = JSON.stringify(await response.json());

      expect(serialized).not.toContain(password);
      expect(serialized).not.toContain("postgresql://");
      expect(serialized).not.toContain("DATABASE_URL");
    } finally {
      await unavailable.$disconnect();
    }
  });
});
