import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as loginRoute } from "@/app/api/admin/auth/login/route";
import { POST as logoutRoute } from "@/app/api/admin/auth/logout/route";
import { GET as meRoute } from "@/app/api/admin/auth/me/route";
import { GET as listProgramsRoute, POST as createProgramRoute } from "@/app/api/admin/programs/route";
import { PATCH as updateConfigurationRoute } from "@/app/api/admin/program-versions/[id]/configuration/route";
import { POST as runTestsRoute } from "@/app/api/admin/program-versions/[id]/tests/route";
import { GET as readinessRoute } from "@/app/api/admin/program-versions/[id]/publication-readiness/route";
import { POST as publishVersionRoute } from "@/app/api/admin/program-versions/[id]/publish/route";
import { POST as createDraftVersionRoute } from "@/app/api/admin/programs/[id]/draft-versions/route";
import { hashAdminPassword } from "@/server/auth/password";
import { hashAdminSessionToken } from "@/server/auth/session-token";
import { resetLoginRateLimitForTests } from "@/server/auth/login-rate-limit";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";
import { disconnectTestDatabase, getTestDatabase, uniqueTestValue } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
const origin = "http://localhost:3000";
const password = "correct horse battery staple";
let passwordHash: string;
let scope: IntegrationTestScope;
let admin: { id: string; email: string };

function jsonRequest(path: string, method: string, body: unknown, cookie?: string, requestOrigin = origin) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      origin: requestOrigin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function getRequest(path: string, cookie?: string) {
  return new Request(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function cookieFrom(response: Response): string {
  const value = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!value) throw new Error("세션 쿠키가 없습니다.");
  return value;
}

async function login(email = admin.email, loginPassword = password) {
  return loginRoute(jsonRequest("/api/admin/auth/login", "POST", { email, password: loginPassword }));
}

function programBody(slug = uniqueTestValue("test-api-program")) {
  return {
    program: {
      slug,
      category: "YOUTH_EMPLOYMENT" as const,
      managingOrganization: "부산광역시 테스트 기관",
      operatingOrganization: "테스트 운영기관",
    },
    version: {
      title: "API 테스트 지원제도",
      shortDescription: "테스트 요약",
      fullDescription: "테스트 상세 설명",
      targetSummary: "부산 청년",
      benefitType: "서비스",
      amountType: "UNDETERMINED" as const,
      minimumAmount: null,
      maximumAmount: null,
      amountUnit: null,
      amountDescription: null,
      applicationType: "ALWAYS_OPEN" as const,
      applicationStartDate: null,
      applicationEndDate: null,
      applicationMethod: "온라인",
      applicationUrl: "https://www.busan.go.kr/",
      contactInformation: "테스트 담당자",
      requiredDocuments: [],
      cautionText: null,
      checkedAt: "2026-07-19",
    },
  };
}

async function authenticatedCookie() {
  return cookieFrom(await login());
}

async function createProgram(cookie: string, body = programBody()) {
  const response = await createProgramRoute(jsonRequest("/api/admin/programs", "POST", body, cookie));
  const payload = await response.json();
  if (response.status === 201) scope.trackProgram(payload.program.id);
  return { response, payload };
}

async function createReadyApiProgram(cookie: string) {
  const created = await createProgram(cookie);
  const versionId = created.payload.initialVersion.id as string;
  await updateConfigurationRoute(
    jsonRequest(`/api/admin/program-versions/${versionId}/configuration`, "PATCH", configurationBody(versionId), cookie),
    { params: Promise.resolve({ id: versionId }) },
  );
  await runTestsRoute(
    jsonRequest(`/api/admin/program-versions/${versionId}/tests`, "POST", {}, cookie),
    { params: Promise.resolve({ id: versionId }) },
  );
  return { programId: created.payload.program.id as string, versionId };
}

function configurationBody(versionId: string) {
  const configuration = createValidDraftConfiguration(versionId, admin.id);
  return {
    sources: configuration.sources,
    regions: configuration.regions,
    rules: configuration.rules,
    testCases: configuration.testCases,
  };
}

describe("admin authentication and API route handlers", () => {
  beforeAll(async () => {
    passwordHash = await hashAdminPassword(password);
    Object.assign(globalThis, { prisma: database });
  });

  beforeEach(async () => {
    resetLoginRateLimitForTests();
    scope = new IntegrationTestScope(database);
    admin = await scope.createAdmin(true, passwordHash);
  });

  afterEach(() => scope.cleanup());
  afterAll(async () => {
    Reflect.deleteProperty(globalThis, "prisma");
    await disconnectTestDatabase();
  });

  it("활성 관리자가 로그인한다", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ admin: { id: admin.id, email: admin.email } });
  });

  it("잘못된 비밀번호 로그인을 동일한 401로 거부한다", async () => {
    const response = await login(admin.email, "wrong password value");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTHENTICATION_FAILED" } });
  });

  it("존재하지 않는 이메일 로그인을 동일한 401로 거부한다", async () => {
    const response = await login("missing@example.com");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTHENTICATION_FAILED" } });
  });

  it("비활성 관리자 로그인을 동일한 401로 거부한다", async () => {
    await database.adminUser.update({ where: { id: admin.id }, data: { active: false } });
    const response = await login();
    expect(response.status).toBe(401);
  });

  it("로그인 성공 시 AdminSession을 생성한다", async () => {
    await login();
    expect(await database.adminSession.count({ where: { adminUserId: admin.id } })).toBe(1);
  });

  it("DB에 원본 토큰이 아닌 hash를 저장한다", async () => {
    const cookie = await authenticatedCookie();
    const token = cookie.split("=", 2)[1]!;
    const session = await database.adminSession.findFirstOrThrow({ where: { adminUserId: admin.id } });
    expect(session.tokenHash).toBe(hashAdminSessionToken(token));
    expect(session.tokenHash).not.toBe(token);
  });

  it("유효한 세션으로 me를 조회한다", async () => {
    const response = await meRoute(getRequest("/api/admin/auth/me", await authenticatedCookie()));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ admin: { id: admin.id } });
  });

  it("만료 세션으로 me를 조회할 수 없다", async () => {
    const cookie = await authenticatedCookie();
    await database.adminSession.updateMany({ where: { adminUserId: admin.id }, data: { expiresAt: new Date("2020-01-01") } });
    expect((await meRoute(getRequest("/api/admin/auth/me", cookie))).status).toBe(401);
  });

  it("폐기 세션으로 me를 조회할 수 없다", async () => {
    const cookie = await authenticatedCookie();
    await database.adminSession.updateMany({ where: { adminUserId: admin.id }, data: { revokedAt: new Date() } });
    expect((await meRoute(getRequest("/api/admin/auth/me", cookie))).status).toBe(401);
  });

  it("로그아웃 후 me를 조회할 수 없다", async () => {
    const cookie = await authenticatedCookie();
    await logoutRoute(jsonRequest("/api/admin/auth/logout", "POST", {}, cookie));
    expect((await meRoute(getRequest("/api/admin/auth/me", cookie))).status).toBe(401);
  });

  it("로그아웃 응답이 세션 쿠키를 삭제한다", async () => {
    const response = await logoutRoute(jsonRequest("/api/admin/auth/logout", "POST", {}, await authenticatedCookie()));
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("인증 없이 프로그램 목록을 조회할 수 없다", async () => {
    expect((await listProgramsRoute(getRequest("/api/admin/programs"))).status).toBe(401);
  });

  it("인증 후 프로그램 목록을 조회한다", async () => {
    expect((await listProgramsRoute(getRequest("/api/admin/programs", await authenticatedCookie()))).status).toBe(200);
  });

  it("인증 없이 프로그램을 생성할 수 없다", async () => {
    expect((await createProgramRoute(jsonRequest("/api/admin/programs", "POST", programBody()))).status).toBe(401);
  });

  it("인증 후 프로그램과 DRAFT를 생성한다", async () => {
    const { response, payload } = await createProgram(await authenticatedCookie());
    expect(response.status).toBe(201);
    expect(payload.initialVersion.publicationStatus).toBe("DRAFT");
  });

  it("요청 본문의 createdById 조작을 거부한다", async () => {
    const body = { ...programBody(), createdById: "another-admin" };
    expect((await createProgramRoute(jsonRequest("/api/admin/programs", "POST", body, await authenticatedCookie()))).status).toBe(400);
  });

  it("인증 없이 DRAFT 구성을 편집할 수 없다", async () => {
    const version = (await scope.createProgramWithVersion(admin.id)).version;
    const response = await updateConfigurationRoute(
      jsonRequest(`/api/admin/program-versions/${version.id}/configuration`, "PATCH", configurationBody(version.id)),
      { params: Promise.resolve({ id: version.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("인증 후 DRAFT 구성을 편집한다", async () => {
    const created = await createProgram(await authenticatedCookie());
    const id = created.payload.initialVersion.id;
    const response = await updateConfigurationRoute(
      jsonRequest(`/api/admin/program-versions/${id}/configuration`, "PATCH", configurationBody(id), await authenticatedCookie()),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
  });

  it("인증 없이 규칙 테스트를 실행할 수 없다", async () => {
    const version = (await scope.createProgramWithVersion(admin.id)).version;
    const response = await runTestsRoute(
      jsonRequest(`/api/admin/program-versions/${version.id}/tests`, "POST", {}),
      { params: Promise.resolve({ id: version.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("인증 후 규칙 테스트를 실행한다", async () => {
    const cookie = await authenticatedCookie();
    const created = await createProgram(cookie);
    const id = created.payload.initialVersion.id;
    await updateConfigurationRoute(jsonRequest(`/api/admin/program-versions/${id}/configuration`, "PATCH", configurationBody(id), cookie), { params: Promise.resolve({ id }) });
    const response = await runTestsRoute(jsonRequest(`/api/admin/program-versions/${id}/tests`, "POST", {}, cookie), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(201);
  });

  it("readiness 조회에 관리자 인증을 요구한다", async () => {
    const version = (await scope.createProgramWithVersion(admin.id)).version;
    const context = { params: Promise.resolve({ id: version.id }) };
    expect((await readinessRoute(getRequest(`/api/admin/program-versions/${version.id}/publication-readiness`), context)).status).toBe(401);
    expect((await readinessRoute(getRequest(`/api/admin/program-versions/${version.id}/publication-readiness`, await authenticatedCookie()), context)).status).toBe(200);
  });

  it("잘못된 Origin의 상태 변경을 차단한다", async () => {
    const response = await createProgramRoute(jsonRequest("/api/admin/programs", "POST", programBody(), await authenticatedCookie(), "https://evil.example"));
    expect(response.status).toBe(403);
  });

  it("중복 slug를 HTTP 409로 반환한다", async () => {
    const cookie = await authenticatedCookie();
    const body = programBody();
    await createProgram(cookie, body);
    const response = await createProgramRoute(jsonRequest("/api/admin/programs", "POST", body, cookie));
    expect(response.status).toBe(409);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toMatchObject({
      error: { code: "PROGRAM_SLUG_CONFLICT" },
    });
    expect(responseText).not.toContain("postgresql://");
    expect(responseText).not.toContain("PrismaClientKnownRequestError");
    expect(responseText).not.toContain("INSERT INTO");
  });

  it("잘못된 입력을 HTTP 400으로 반환한다", async () => {
    const response = await createProgramRoute(jsonRequest("/api/admin/programs", "POST", { program: {} }, await authenticatedCookie()));
    expect(response.status).toBe(400);
  });

  it("오류 응답에 DB 연결 문자열을 포함하지 않는다", async () => {
    const response = await createProgramRoute(jsonRequest("/api/admin/programs", "POST", { invalid: true }, await authenticatedCookie()));
    expect(await response.text()).not.toContain("postgresql://");
  });

  it("관리자 A 세션으로 관리자 B ID를 주입할 수 없다", async () => {
    const other = await scope.createAdmin(true, passwordHash);
    const body = { ...programBody(), createdById: other.id };
    expect((await createProgramRoute(jsonRequest("/api/admin/programs", "POST", body, await authenticatedCookie()))).status).toBe(400);
  });

  it("관리자 비활성화 시 기존 세션을 차단한다", async () => {
    const cookie = await authenticatedCookie();
    await database.adminUser.update({ where: { id: admin.id }, data: { active: false } });
    expect((await meRoute(getRequest("/api/admin/auth/me", cookie))).status).toBe(401);
  });

  it("로그아웃은 다른 세션을 폐기하지 않는다", async () => {
    const first = await authenticatedCookie();
    const second = await authenticatedCookie();
    await logoutRoute(jsonRequest("/api/admin/auth/logout", "POST", {}, first));
    expect((await meRoute(getRequest("/api/admin/auth/me", second))).status).toBe(200);
  });

  it("게시 API는 인증 없이는 401을 반환한다", async () => {
    const response = await publishVersionRoute(
      jsonRequest("/api/admin/program-versions/missing/publish", "POST", { reason: "게시" }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(401);
  });

  it("게시 API는 잘못된 Origin을 403으로 차단한다", async () => {
    const response = await publishVersionRoute(
      jsonRequest("/api/admin/program-versions/missing/publish", "POST", { reason: "게시" }, await authenticatedCookie(), "https://evil.example"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(403);
  });

  it("인증 후 게시 API가 DRAFT를 게시한다", async () => {
    const cookie = await authenticatedCookie();
    const { versionId } = await createReadyApiProgram(cookie);
    const response = await publishVersionRoute(
      jsonRequest(`/api/admin/program-versions/${versionId}/publish`, "POST", { reason: "API 게시" }, cookie),
      { params: Promise.resolve({ id: versionId }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ publishedVersion: { id: versionId, publicationStatus: "PUBLISHED" } });
  });

  it("새 DRAFT API는 인증 없이는 401을 반환한다", async () => {
    const response = await createDraftVersionRoute(
      jsonRequest("/api/admin/programs/missing/draft-versions", "POST", {}),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(401);
  });

  it("인증 후 새 DRAFT API가 게시 버전을 복제한다", async () => {
    const cookie = await authenticatedCookie();
    const { programId, versionId } = await createReadyApiProgram(cookie);
    await publishVersionRoute(jsonRequest(`/api/admin/program-versions/${versionId}/publish`, "POST", { reason: "API 게시" }, cookie), { params: Promise.resolve({ id: versionId }) });
    const response = await createDraftVersionRoute(
      jsonRequest(`/api/admin/programs/${programId}/draft-versions`, "POST", {}, cookie),
      { params: Promise.resolve({ id: programId }) },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ programId, draftVersion: { versionNumber: 2, publicationStatus: "DRAFT" } });
  });

  it("게시 API 본문의 관리자 ID 조작을 거부한다", async () => {
    const response = await publishVersionRoute(
      jsonRequest("/api/admin/program-versions/missing/publish", "POST", { reason: "게시", publishedById: "attacker" }, await authenticatedCookie()),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(400);
  });

  it("기존 DRAFT 충돌을 HTTP 409로 반환한다", async () => {
    const cookie = await authenticatedCookie();
    const { programId, versionId } = await createReadyApiProgram(cookie);
    await publishVersionRoute(jsonRequest(`/api/admin/program-versions/${versionId}/publish`, "POST", { reason: "API 게시" }, cookie), { params: Promise.resolve({ id: versionId }) });
    const request = () => createDraftVersionRoute(
      jsonRequest(`/api/admin/programs/${programId}/draft-versions`, "POST", {}, cookie),
      { params: Promise.resolve({ id: programId }) },
    );
    expect((await request()).status).toBe(201);
    expect((await request()).status).toBe(409);
  });

  it("게시·DRAFT API 데이터도 scope 종료 후 정리된다", async () => {
    const cookie = await authenticatedCookie();
    const { programId, versionId } = await createReadyApiProgram(cookie);
    await publishVersionRoute(jsonRequest(`/api/admin/program-versions/${versionId}/publish`, "POST", { reason: "API 게시" }, cookie), { params: Promise.resolve({ id: versionId }) });
    await createDraftVersionRoute(jsonRequest(`/api/admin/programs/${programId}/draft-versions`, "POST", {}, cookie), { params: Promise.resolve({ id: programId }) });
    await scope.cleanup();
    expect(await database.supportProgram.findUnique({ where: { id: programId } })).toBeNull();
  });

  it("독립 scope 정리 후 관리자·세션·프로그램이 남지 않는다", async () => {
    const isolated = new IntegrationTestScope(database);
    const isolatedAdmin = await isolated.createAdmin(true, passwordHash);
    const version = await isolated.createProgramWithVersion(isolatedAdmin.id);
    await database.adminSession.create({ data: { adminUserId: isolatedAdmin.id, tokenHash: uniqueTestValue("hash"), expiresAt: new Date("2030-01-01") } });
    await isolated.cleanup();
    expect(await database.adminUser.findUnique({ where: { id: isolatedAdmin.id } })).toBeNull();
    expect(await database.supportProgram.findUnique({ where: { id: version.program.id } })).toBeNull();
  });
});
