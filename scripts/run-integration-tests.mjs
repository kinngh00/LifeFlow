import "dotenv/config";

import { spawnSync } from "node:child_process";
import path from "node:path";

function normalizeUrl(value) {
  if (!value) return undefined;
  const url = new URL(value);
  url.searchParams.sort();
  return url.toString();
}

function getSafeTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL이 없습니다. 개발·운영 DB 보호를 위해 통합 테스트를 중단합니다.",
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL 형식이 올바르지 않습니다.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("통합 테스트는 PostgreSQL URL만 허용합니다.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("통합 테스트 DB는 로컬 호스트만 허용합니다.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("테스트 DB 이름에는 'test'가 포함되어야 합니다.");
  }

  const normalized = normalizeUrl(value);
  if (
    normalized === normalizeUrl(process.env.DATABASE_URL) ||
    normalized === normalizeUrl(process.env.DIRECT_URL)
  ) {
    throw new Error("테스트 DB URL은 개발·운영 DB URL과 달라야 합니다.");
  }

  return value;
}

function runNodeCli(entrypoint, args, environment) {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  const testDatabaseUrl = getSafeTestDatabaseUrl();
  const testEnvironment = {
    ...process.env,
    TEST_DATABASE_URL: testDatabaseUrl,
  };
  const migrationEnvironment = {
    ...testEnvironment,
    DATABASE_URL: testDatabaseUrl,
  };

  runNodeCli(
    path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
    ["migrate", "deploy"],
    migrationEnvironment,
  );
  runNodeCli(
    path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs"),
    ["run", "--config", "vitest.integration.config.mts"],
    testEnvironment,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "통합 테스트 준비 실패";
  console.error(message);
  process.exit(1);
}
