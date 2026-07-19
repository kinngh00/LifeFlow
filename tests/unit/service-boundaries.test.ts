import { describe, expect, it } from "vitest";
import { AdminProgramListQuerySchema } from "@/features/admin/programs/schemas/admin-program-list.schema";
import { CreateProgramWithInitialVersionSchema } from "@/features/admin/programs/schemas/create-program.schema";
import { assertSafeTestDatabaseUrl } from "@/server/db/test-database-url";

const validCreateInput = {
  program: {
    slug: "test-program",
    category: "YOUTH_EMPLOYMENT",
    managingOrganization: "부산광역시",
    operatingOrganization: null,
  },
  version: {
    title: "테스트 지원제도",
    shortDescription: "요약",
    fullDescription: "상세 설명",
    targetSummary: "부산 청년",
    benefitType: "현금",
    amountType: "RANGE",
    minimumAmount: "100000",
    maximumAmount: "200000",
    amountUnit: "원",
    amountDescription: null,
    applicationType: "FIXED_PERIOD",
    applicationStartDate: "2026-07-01",
    applicationEndDate: "2026-07-31",
    applicationMethod: "온라인",
    applicationUrl: "https://www.busan.go.kr/",
    contactInformation: "테스트 담당자",
    requiredDocuments: ["신청서"],
    cautionText: null,
    checkedAt: "2026-07-19",
  },
  createdById: "admin-1",
} as const;

describe("AdminProgramListQuerySchema", () => {
  it("기본 페이지 값과 페이지 크기 상한을 적용한다", () => {
    expect(AdminProgramListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      includeArchived: false,
    });
    expect(
      AdminProgramListQuerySchema.safeParse({ pageSize: 101 }).success,
    ).toBe(false);
  });

  it("공백 검색어와 지나치게 긴 검색어를 거부한다", () => {
    expect(AdminProgramListQuerySchema.safeParse({ search: "   " }).success).toBe(
      false,
    );
    expect(
      AdminProgramListQuerySchema.safeParse({ search: "x".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("CreateProgramWithInitialVersionSchema", () => {
  it("정상적인 범위형 금액을 허용한다", () => {
    expect(CreateProgramWithInitialVersionSchema.safeParse(validCreateInput).success).toBe(
      true,
    );
  });

  it("앞뒤 또는 연속 하이픈이 있는 slug를 거부한다", () => {
    for (const slug of ["-test", "test-", "test--program"]) {
      const result = CreateProgramWithInitialVersionSchema.safeParse({
        ...validCreateInput,
        program: { ...validCreateInput.program, slug },
      });
      expect(result.success).toBe(false);
    }
  });

  it("최소 금액이 최대 금액보다 큰 입력을 거부한다", () => {
    const result = CreateProgramWithInitialVersionSchema.safeParse({
      ...validCreateInput,
      version: {
        ...validCreateInput.version,
        minimumAmount: "300000",
        maximumAmount: "200000",
      },
    });

    expect(result.success).toBe(false);
  });

  it("DRAFT 이외의 게시 상태 필드를 입력으로 받지 않는다", () => {
    const result = CreateProgramWithInitialVersionSchema.safeParse({
      ...validCreateInput,
      version: {
        ...validCreateInput.version,
        publicationStatus: "PUBLISHED",
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("assertSafeTestDatabaseUrl", () => {
  it("TEST_DATABASE_URL 누락 시 즉시 중단한다", () => {
    expect(() => assertSafeTestDatabaseUrl({})).toThrow("TEST_DATABASE_URL");
  });

  it("test가 없는 DB 이름과 원격 호스트를 거부한다", () => {
    expect(() =>
      assertSafeTestDatabaseUrl({
        testDatabaseUrl: "postgresql://user:pass@localhost:5432/lifeflow",
      }),
    ).toThrow("test");
    expect(() =>
      assertSafeTestDatabaseUrl({
        testDatabaseUrl: "postgresql://user:pass@db.example.com/lifeflow_test",
      }),
    ).toThrow("로컬");
  });

  it("개발 DB URL과 동일한 테스트 URL을 거부한다", () => {
    const url = "postgresql://user:pass@localhost:5432/lifeflow_test";
    expect(() =>
      assertSafeTestDatabaseUrl({
        testDatabaseUrl: url,
        databaseUrl: url,
      }),
    ).toThrow("달라야");
  });

  it("분리된 로컬 테스트 DB URL을 허용한다", () => {
    const url = "postgresql://user:pass@127.0.0.1:5434/lifeflow_test";
    expect(
      assertSafeTestDatabaseUrl({
        testDatabaseUrl: url,
        databaseUrl: "postgresql://user:pass@127.0.0.1:5433/lifeflow",
      }),
    ).toBe(url);
  });
});
