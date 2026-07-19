type TestDatabaseUrlInput = {
  testDatabaseUrl?: string;
  databaseUrl?: string;
  directUrl?: string;
};

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const url = new URL(value);
  url.searchParams.sort();
  return url.toString();
}

export function assertSafeTestDatabaseUrl({
  testDatabaseUrl,
  databaseUrl,
  directUrl,
}: TestDatabaseUrlInput): string {
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL이 없습니다. 통합 테스트는 실행되지 않았습니다.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(testDatabaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL 형식이 올바르지 않습니다.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("통합 테스트는 PostgreSQL TEST_DATABASE_URL만 허용합니다.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("통합 테스트 DB는 로컬 호스트만 허용합니다.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("테스트 DB 이름에는 'test'가 포함되어야 합니다.");
  }

  const normalizedTestUrl = normalizeUrl(testDatabaseUrl);
  if (
    normalizedTestUrl === normalizeUrl(databaseUrl) ||
    normalizedTestUrl === normalizeUrl(directUrl)
  ) {
    throw new Error(
      "TEST_DATABASE_URL은 DATABASE_URL 또는 DIRECT_URL과 달라야 합니다.",
    );
  }

  return testDatabaseUrl;
}
