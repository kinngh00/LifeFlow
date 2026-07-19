import { describe, expect, it } from "vitest";
import { buildProgramVersionPublicationReadiness } from "@/features/admin/programs/validators/publication-readiness";
import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import { createProgramTestRecord } from "../fixtures/program-test-record";

function readyRecord() {
  const record = Object.assign(createProgramTestRecord(), { ruleTestRuns: [] as Array<{ id: string; configurationHash: string; overallPassed: boolean; executedAt: Date }> });
  record.ruleTestRuns.push({ id: "run-1", configurationHash: calculateProgramConfigurationHash(record), overallPassed: true, executedAt: new Date("2026-07-19T00:00:00.000Z") });
  return record;
}

async function readiness(record = readyRecord()) {
  return buildProgramVersionPublicationReadiness(record);
}

describe("publication readiness", () => {
  it("최신 테스트가 없으면 ready=false다", async () => {
    const record = readyRecord(); record.ruleTestRuns = [];
    expect((await readiness(record)).ready).toBe(false);
  });

  it("최신 테스트가 실패하면 ready=false다", async () => {
    const record = readyRecord(); record.ruleTestRuns[0]!.overallPassed = false;
    expect((await readiness(record)).checks.find(({ code }) => code === "LATEST_TEST_PASSED")?.passed).toBe(false);
  });

  it("configurationHash가 다르면 ready=false다", async () => {
    const record = readyRecord(); record.ruleTestRuns[0]!.configurationHash = "different";
    expect((await readiness(record)).checks.find(({ code }) => code === "LATEST_TEST_CONFIGURATION_MATCH")?.passed).toBe(false);
  });

  it("대표 출처가 없으면 ready=false다", async () => {
    const record = readyRecord(); record.sources[0]!.isPrimary = false;
    expect((await readiness(record)).checks.find(({ code }) => code === "PRIMARY_SOURCE_PRESENT")?.passed).toBe(false);
  });

  it("활성 필수 규칙이 없으면 ready=false다", async () => {
    const record = readyRecord(); record.eligibilityRules[0]!.required = false;
    expect((await readiness(record)).checks.find(({ code }) => code === "REQUIRED_RULE_PRESENT")?.passed).toBe(false);
  });

  it("모든 조건과 최신 hash가 일치하면 ready=true다", async () => {
    expect((await readiness()).ready).toBe(true);
  });
});
