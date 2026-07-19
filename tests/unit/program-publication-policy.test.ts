import { describe, expect, it } from "vitest";
import { getDomainErrorHttpStatus } from "@/server/errors/domain-error";
import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import {
  CreateDraftVersionBodySchema,
  PublishProgramVersionBodySchema,
} from "@/features/admin/programs/schemas/admin-program-api.schema";
import {
  CreateDraftVersionFromPublishedSchema,
  PublishProgramVersionSchema,
} from "@/features/admin/programs/schemas/program-publication.schema";
import {
  assertPublicationReadiness,
  assertProgramVersionCanBePublished,
} from "@/features/admin/programs/services/publish-program-version";
import {
  assertDraftSourceVersion,
  getExistingDraft,
  getNextVersionNumber,
  resolveDraftSourceVersionId,
} from "@/features/admin/programs/services/create-draft-version-from-published";
import { buildProgramVersionPublicationReadiness } from "@/features/admin/programs/validators/publication-readiness";
import { createProgramTestRecord } from "../fixtures/program-test-record";

function readyResult() {
  const record = Object.assign(createProgramTestRecord(), {
    ruleTestRuns: [] as Array<{
      id: string;
      configurationHash: string;
      overallPassed: boolean;
      executedAt: Date;
    }>,
  });
  record.ruleTestRuns.push({
    id: "run-1",
    configurationHash: calculateProgramConfigurationHash(record),
    overallPassed: true,
    executedAt: new Date("2026-07-19T00:00:00.000Z"),
  });
  return { record, readiness: buildProgramVersionPublicationReadiness(record) };
}

describe("program publication input policy", () => {
  it("게시 입력을 검증한다", () => {
    expect(PublishProgramVersionSchema.parse({ programVersionId: "v1", publishedById: "a1", reason: "최초 게시" })).toBeTruthy();
  });
  it("빈 게시 사유를 거부한다", () => {
    expect(() => PublishProgramVersionSchema.parse({ programVersionId: "v1", publishedById: "a1", reason: " " })).toThrow();
  });
  it("게시 API 본문의 관리자 ID 주입을 거부한다", () => {
    expect(() => PublishProgramVersionBodySchema.parse({ reason: "게시", publishedById: "attacker" })).toThrow();
  });
  it("sourceVersionId 없는 DRAFT 입력을 허용한다", () => {
    expect(CreateDraftVersionFromPublishedSchema.parse({ programId: "p1", createdById: "a1" }).sourceVersionId).toBeUndefined();
  });
  it("DRAFT API 본문의 관리자 ID 주입을 거부한다", () => {
    expect(() => CreateDraftVersionBodySchema.parse({ createdById: "attacker" })).toThrow();
  });
});

describe("publish policy", () => {
  it("DRAFT 상태는 게시 가능하다", () => {
    expect(() => assertProgramVersionCanBePublished("DRAFT")).not.toThrow();
  });
  it("PUBLISHED 상태의 중복 게시를 차단한다", () => {
    expect(() => assertProgramVersionCanBePublished("PUBLISHED")).toThrowError(expect.objectContaining({ code: "PROGRAM_VERSION_ALREADY_PUBLISHED" }));
  });
  it("UNPUBLISHED 상태를 게시하지 않는다", () => {
    expect(() => assertProgramVersionCanBePublished("UNPUBLISHED")).toThrowError(expect.objectContaining({ code: "PROGRAM_VERSION_NOT_PUBLISHABLE" }));
  });
  it("ready=true를 허용한다", () => {
    expect(() => assertPublicationReadiness(readyResult().readiness)).not.toThrow();
  });
  it("최신 hash 불일치를 별도 오류로 차단한다", () => {
    const { record } = readyResult();
    record.ruleTestRuns[0]!.configurationHash = "outdated";
    expect(() => assertPublicationReadiness(buildProgramVersionPublicationReadiness(record))).toThrowError(expect.objectContaining({ code: "TEST_CONFIGURATION_OUTDATED" }));
  });
  it("최신 테스트 실패를 readiness 오류로 차단한다", () => {
    const { record } = readyResult();
    record.ruleTestRuns[0]!.overallPassed = false;
    expect(() => assertPublicationReadiness(buildProgramVersionPublicationReadiness(record))).toThrowError(expect.objectContaining({ code: "PUBLICATION_READINESS_FAILED" }));
  });
  it("필수 테스트 사례가 없으면 게시하지 않는다", () => {
    const { record } = readyResult();
    record.ruleTestCases = [];
    expect(() => assertPublicationReadiness(buildProgramVersionPublicationReadiness(record))).toThrowError(expect.objectContaining({ code: "TEST_CONFIGURATION_OUTDATED" }));
  });
});

describe("new draft policy", () => {
  const versions = [
    { id: "v1", versionNumber: 1, publicationStatus: "PUBLISHED" },
    { id: "v3", versionNumber: 3, publicationStatus: "UNPUBLISHED" },
    { id: "v2", versionNumber: 2, publicationStatus: "DRAFT" },
  ];

  it("최대 버전 번호에 1을 더한다", () => expect(getNextVersionNumber(versions)).toBe(4));
  it("버전이 없으면 1부터 시작한다", () => expect(getNextVersionNumber([])).toBe(1));
  it("기존 DRAFT를 찾는다", () => expect(getExistingDraft(versions)?.id).toBe("v2"));
  it("DRAFT가 없으면 null이다", () => expect(getExistingDraft(versions.slice(0, 2))).toBeNull());
  it("명시한 sourceVersionId를 우선한다", () => expect(resolveDraftSourceVersionId("requested", "current")).toBe("requested"));
  it("sourceVersionId가 없으면 현재 게시 버전을 사용한다", () => expect(resolveDraftSourceVersionId(undefined, "current")).toBe("current"));
  it("현재 게시 버전도 없으면 차단한다", () => {
    expect(() => resolveDraftSourceVersionId(undefined, null)).toThrowError(expect.objectContaining({ code: "PROGRAM_VERSION_NOT_FOUND" }));
  });
  it("같은 프로그램의 PUBLISHED 버전을 허용한다", () => expect(() => assertDraftSourceVersion({ programId: "p1", publicationStatus: "PUBLISHED" }, "p1")).not.toThrow());
  it("같은 프로그램의 UNPUBLISHED 버전을 허용한다", () => expect(() => assertDraftSourceVersion({ programId: "p1", publicationStatus: "UNPUBLISHED" }, "p1")).not.toThrow());
  it("다른 프로그램의 버전을 차단한다", () => {
    expect(() => assertDraftSourceVersion({ programId: "p2", publicationStatus: "PUBLISHED" }, "p1")).toThrowError(expect.objectContaining({ code: "SOURCE_VERSION_NOT_IN_PROGRAM" }));
  });
  it("DRAFT를 복제 원본으로 사용하지 않는다", () => {
    expect(() => assertDraftSourceVersion({ programId: "p1", publicationStatus: "DRAFT" }, "p1")).toThrowError(expect.objectContaining({ code: "PROGRAM_VERSION_NOT_PUBLISHABLE" }));
  });
});

describe("publication HTTP mapping", () => {
  it("게시 준비 실패는 409다", () => expect(getDomainErrorHttpStatus("PUBLICATION_READINESS_FAILED")).toBe(409));
  it("기존 DRAFT 충돌은 409다", () => expect(getDomainErrorHttpStatus("DRAFT_VERSION_ALREADY_EXISTS")).toBe(409));
  it("트랜잭션 충돌은 409다", () => expect(getDomainErrorHttpStatus("TRANSACTION_CONFLICT")).toBe(409));
});
