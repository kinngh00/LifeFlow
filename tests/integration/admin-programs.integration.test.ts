import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createProgramWithInitialVersion } from "@/features/admin/programs/services/create-program-with-initial-version";
import { listAdminPrograms } from "@/features/admin/programs/services/list-admin-programs";
import type { CreateProgramWithInitialVersionInput } from "@/features/admin/programs/schemas/create-program.schema";
import {
  disconnectTestDatabase,
  getTestDatabase,
  uniqueTestValue,
} from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
let scope: IntegrationTestScope;
let activeAdminId: string;
let testMarker: string;

function createInput(
  createdById: string,
  overrides: {
    slug?: string;
    category?: "YOUTH_EMPLOYMENT" | "YOUTH_HOUSING";
    managingOrganization?: string;
    title?: string;
  } = {},
): CreateProgramWithInitialVersionInput {
  return {
    program: {
      slug: overrides.slug ?? uniqueTestValue(`${testMarker}-program`),
      category: overrides.category ?? "YOUTH_EMPLOYMENT",
      managingOrganization:
        overrides.managingOrganization ?? `${testMarker} 부산광역시 테스트 기관`,
      operatingOrganization: "테스트 운영기관",
    },
    version: {
      title: overrides.title ?? `${testMarker} 테스트 청년 지원제도`,
      shortDescription: "테스트 지원제도 요약",
      fullDescription: "테스트 지원제도 상세 설명",
      targetSummary: "부산 청년 테스트 대상",
      benefitType: "서비스",
      amountType: "UNDETERMINED",
      minimumAmount: null,
      maximumAmount: null,
      amountUnit: null,
      amountDescription: null,
      applicationType: "FIXED_PERIOD",
      applicationStartDate: "2026-07-01",
      applicationEndDate: "2026-07-31",
      applicationMethod: "공식 홈페이지 신청",
      applicationUrl: "https://www.busan.go.kr/",
      contactInformation: "부산광역시 테스트 담당자",
      requiredDocuments: [],
      cautionText: null,
      checkedAt: "2026-07-19",
    },
    createdById,
  };
}

async function createAndTrack(
  input: CreateProgramWithInitialVersionInput = createInput(activeAdminId),
) {
  const result = await createProgramWithInitialVersion(input, { database });
  scope.trackProgram(result.program.id);
  return result;
}

describe("admin program services", () => {
  beforeEach(async () => {
    scope = new IntegrationTestScope(database);
    testMarker = uniqueTestValue("test-scope");
    activeAdminId = (await scope.createAdmin(true)).id;
  });

  afterEach(async () => {
    await scope.cleanup();
  });

  afterAll(disconnectTestDatabase);

  it("정상 입력으로 SupportProgram과 ProgramVersion을 생성한다", async () => {
    const result = await createAndTrack();
    const storedProgram = await database.supportProgram.findUnique({
      where: { id: result.program.id },
      include: { versions: true },
    });

    expect(storedProgram).not.toBeNull();
    expect(storedProgram?.versions).toHaveLength(1);
  });

  it("첫 버전의 versionNumber를 1로 생성한다", async () => {
    const result = await createAndTrack();

    expect(result.initialVersion.versionNumber).toBe(1);
  });

  it("첫 버전의 publicationStatus를 DRAFT로 생성한다", async () => {
    const result = await createAndTrack();

    expect(result.initialVersion.publicationStatus).toBe("DRAFT");
  });

  it("생성 시 currentPublishedVersionId를 설정하지 않는다", async () => {
    const result = await createAndTrack();
    const stored = await database.supportProgram.findUnique({
      where: { id: result.program.id },
    });

    expect(stored?.currentPublishedVersionId).toBeNull();
  });

  it("비활성 관리자는 생성할 수 없다", async () => {
    const inactiveAdmin = await scope.createAdmin(false);

    await expect(
      createProgramWithInitialVersion(createInput(inactiveAdmin.id), { database }),
    ).rejects.toMatchObject({ code: "ADMIN_INACTIVE" });
  });

  it("존재하지 않는 관리자는 생성할 수 없다", async () => {
    await expect(
      createProgramWithInitialVersion(createInput("missing-admin"), { database }),
    ).rejects.toMatchObject({ code: "ADMIN_NOT_FOUND" });
  });

  it("중복 slug를 PROGRAM_SLUG_CONFLICT로 변환한다", async () => {
    const slug = uniqueTestValue("test-program-conflict");
    await createAndTrack(createInput(activeAdminId, { slug }));

    await expect(
      createProgramWithInitialVersion(createInput(activeAdminId, { slug }), {
        database,
      }),
    ).rejects.toMatchObject({ code: "PROGRAM_SLUG_CONFLICT" });
  });

  it("버전 생성 실패 시 SupportProgram도 롤백한다", async () => {
    const slug = uniqueTestValue("test-program-rollback");

    await expect(
      createProgramWithInitialVersion(createInput(activeAdminId, { slug }), {
        database,
        createVersion: async () => {
          throw new Error("injected version creation failure");
        },
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });

    expect(
      await database.supportProgram.findUnique({ where: { slug } }),
    ).toBeNull();
  });

  it("applicationType과 날짜가 모순되면 DB 호출 전에 실패한다", async () => {
    let transactionCalled = false;
    const invalidInput = createInput(activeAdminId);
    invalidInput.version.applicationType = "ALWAYS_OPEN";
    const fakeDatabase = {
      $transaction: () => {
        transactionCalled = true;
      },
    } as unknown as PrismaClient;

    await expect(
      createProgramWithInitialVersion(invalidInput, { database: fakeDatabase }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(transactionCalled).toBe(false);
  });

  it("금액 범위가 잘못되면 DB 호출 전에 실패한다", async () => {
    let transactionCalled = false;
    const invalidInput = createInput(activeAdminId);
    invalidInput.version.amountType = "RANGE";
    invalidInput.version.minimumAmount = "200000";
    invalidInput.version.maximumAmount = "100000";
    const fakeDatabase = {
      $transaction: () => {
        transactionCalled = true;
      },
    } as unknown as PrismaClient;

    await expect(
      createProgramWithInitialVersion(invalidInput, { database: fakeDatabase }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(transactionCalled).toBe(false);
  });

  it("생성한 지원제도를 관리자 목록에서 조회한다", async () => {
    const created = await createAndTrack();
    const result = await listAdminPrograms({ search: testMarker }, database);

    expect(result.items.map((item) => item.id)).toContain(created.program.id);
  });

  it("category로 목록을 필터링한다", async () => {
    const employment = await createAndTrack(
      createInput(activeAdminId, { category: "YOUTH_EMPLOYMENT" }),
    );
    await createAndTrack(
      createInput(activeAdminId, { category: "YOUTH_HOUSING" }),
    );
    const result = await listAdminPrograms(
      { category: "YOUTH_EMPLOYMENT", search: testMarker },
      database,
    );

    expect(result.items.map((item) => item.id)).toContain(employment.program.id);
    expect(result.items.every((item) => item.category === "YOUTH_EMPLOYMENT")).toBe(
      true,
    );
  });

  it("publicationStatus로 목록을 필터링한다", async () => {
    const published = await createAndTrack();
    await createAndTrack();
    await database.programVersion.updateMany({
      where: { programId: published.program.id },
      data: { publicationStatus: "PUBLISHED", publishedAt: new Date() },
    });
    const result = await listAdminPrograms(
      { publicationStatus: "PUBLISHED", search: testMarker },
      database,
    );

    expect(result.items.map((item) => item.id)).toEqual([published.program.id]);
  });

  it("slug, 버전 제목과 기관명에 검색어를 적용한다", async () => {
    const slug = uniqueTestValue("test-program-searchable");
    const titleMarker = uniqueTestValue("search-title");
    const organizationMarker = uniqueTestValue("search-organization");
    const created = await createAndTrack(
      createInput(activeAdminId, {
        slug,
        title: `${titleMarker} 찾을수있는 특별 제목`,
        managingOrganization: `${organizationMarker} 찾을수있는 특별 기관`,
      }),
    );

    for (const search of [slug, titleMarker, organizationMarker]) {
      const result = await listAdminPrograms({ search }, database);
      expect(result.items.map((item) => item.id)).toContain(created.program.id);
    }
  });

  it("기본 목록에서 archived 제도를 제외한다", async () => {
    const archived = await createAndTrack();
    await database.supportProgram.update({
      where: { id: archived.program.id },
      data: { archivedAt: new Date() },
    });

    const defaultResult = await listAdminPrograms(
      { search: testMarker },
      database,
    );
    const includedResult = await listAdminPrograms(
      { includeArchived: true, search: testMarker },
      database,
    );

    expect(defaultResult.items.map((item) => item.id)).not.toContain(
      archived.program.id,
    );
    expect(includedResult.items.map((item) => item.id)).toContain(
      archived.program.id,
    );
  });

  it("page와 pageSize로 목록을 나눈다", async () => {
    await createAndTrack();
    await createAndTrack();
    await createAndTrack();

    const firstPage = await listAdminPrograms(
      { page: 1, pageSize: 2, search: testMarker },
      database,
    );
    const secondPage = await listAdminPrograms(
      { page: 2, pageSize: 2, search: testMarker },
      database,
    );

    expect(firstPage.items).toHaveLength(2);
    expect(secondPage.items).toHaveLength(1);
    expect(firstPage.total).toBe(3);
    expect(firstPage.items[0]?.id).not.toBe(secondPage.items[0]?.id);
  });

  it("updatedAt 내림차순으로 정렬한다", async () => {
    const older = await createAndTrack();
    const newer = await createAndTrack();
    await database.supportProgram.update({
      where: { id: older.program.id },
      data: { updatedAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await database.supportProgram.update({
      where: { id: newer.program.id },
      data: { updatedAt: new Date("2026-02-01T00:00:00.000Z") },
    });

    const result = await listAdminPrograms({ search: testMarker }, database);

    expect(result.items.map((item) => item.id)).toEqual([
      newer.program.id,
      older.program.id,
    ]);
  });

  it("latestVersion과 currentPublishedVersion을 구분한다", async () => {
    const created = await createAndTrack();
    const firstVersion = await database.programVersion.findFirstOrThrow({
      where: { programId: created.program.id },
    });
    await database.programVersion.update({
      where: { id: firstVersion.id },
      data: { publicationStatus: "PUBLISHED", publishedAt: new Date() },
    });
    await database.supportProgram.update({
      where: { id: created.program.id },
      data: { currentPublishedVersionId: firstVersion.id },
    });
    const secondVersion = await database.programVersion.create({
      data: {
        programId: created.program.id,
        versionNumber: 2,
        title: "최신 DRAFT 버전",
        shortDescription: "두 번째 버전",
        fullDescription: "두 번째 버전 상세",
        targetSummary: "테스트 대상",
        benefitType: "서비스",
        amountType: "UNDETERMINED",
        applicationType: "ALWAYS_OPEN",
        applicationMethod: "온라인",
        contactInformation: "테스트 담당자",
        requiredDocuments: [],
        checkedAt: new Date("2026-07-19T00:00:00.000Z"),
        publicationStatus: "DRAFT",
        createdById: activeAdminId,
      },
    });

    const result = await listAdminPrograms({ search: testMarker }, database);
    const item = result.items.find(({ id }) => id === created.program.id);

    expect(item?.currentPublishedVersion?.id).toBe(firstVersion.id);
    expect(item?.latestVersion?.id).toBe(secondVersion.id);
    expect(item?.versionCount).toBe(2);
  });
});
