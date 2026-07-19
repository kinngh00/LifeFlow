import { describe, expect, it } from "vitest";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import { buildProgramVersionPublicationReadiness } from "@/features/admin/programs/validators/publication-readiness";
import { parseDraftProgramConfiguration } from "@/features/admin/programs/validators/draft-program-configuration.validator";
import { ProgramRegionCreateSchema, regionConditionSchema } from "@/schemas";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";
import { createProgramTestRecord } from "../fixtures/program-test-record";

const nationalRegion = {
  programVersionId: "version-1",
  coverageType: "NATIONAL" as const,
  cityCode: null,
  districtCode: null,
  reviewRequired: false,
  requirementNote: null,
};

describe("NATIONAL region domain", () => {
  it("accepts NATIONAL only with null location codes", () => {
    expect(ProgramRegionCreateSchema.safeParse(nationalRegion).success).toBe(true);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, cityCode: "26000" }).success).toBe(false);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, districtCode: "ALL" }).success).toBe(false);
  });

  it("requires a note whenever a region needs manual review", () => {
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, reviewRequired: true }).success).toBe(false);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, reviewRequired: true, requirementNote: "공고의 별도 요건 확인" }).success).toBe(true);
  });

  it("keeps NATIONAL, CITY_WIDE, and DISTRICT rule conditions distinct", () => {
    expect(regionConditionSchema.safeParse({ coverage: "NATIONAL", cityCode: null }).success).toBe(true);
    expect(regionConditionSchema.safeParse({ coverage: "NATIONAL", cityCode: "26000" }).success).toBe(false);
    expect(regionConditionSchema.safeParse({ coverage: "CITY_WIDE", cityCode: "26000" }).success).toBe(true);
    expect(regionConditionSchema.safeParse({ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26110"] }).success).toBe(true);
    expect(regionConditionSchema.safeParse({ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26999"] }).success).toBe(false);
  });

  it("rejects invalid CITY_WIDE and DISTRICT metadata shapes", () => {
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL" }).success).toBe(true);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "26110" }).success).toBe(false);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, coverageType: "DISTRICT", cityCode: "26000", districtCode: "26110" }).success).toBe(true);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, coverageType: "DISTRICT", cityCode: "26000", districtCode: "ALL" }).success).toBe(false);
    expect(ProgramRegionCreateSchema.safeParse({ ...nationalRegion, coverageType: "DISTRICT", cityCode: "26000", districtCode: "26999" }).success).toBe(false);
  });

  it("persists a NATIONAL draft input shape without inventing Busan codes", () => {
    const input = createValidDraftConfiguration();
    input.regions = [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null }];
    expect(parseDraftProgramConfiguration(input).regions).toEqual(input.regions);
  });

  it("rejects mixed NATIONAL and local coverage", () => {
    const input = createValidDraftConfiguration();
    input.regions.push({ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null });
    expect(() => parseDraftProgramConfiguration(input)).toThrow(expect.objectContaining({ code: "REGION_CONFLICT" }));
  });

  it.each([
    [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null }],
    [{ coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL", reviewRequired: false, requirementNote: null }],
    [{ coverageType: "DISTRICT", cityCode: "26000", districtCode: "26110", reviewRequired: false, requirementNote: null }],
  ])("rejects duplicate region entries", (region) => {
    const input = createValidDraftConfiguration();
    input.regions = [region as never, { ...region } as never];
    expect(() => parseDraftProgramConfiguration(input)).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
  });

  it("allows multiple distinct Busan districts", () => {
    const input = createValidDraftConfiguration();
    input.regions = [
      { coverageType: "DISTRICT", cityCode: "26000", districtCode: "26110", reviewRequired: false, requirementNote: null },
      { coverageType: "DISTRICT", cityCode: "26000", districtCode: "26140", reviewRequired: false, requirementNote: null },
    ];
    expect(parseDraftProgramConfiguration(input).regions).toHaveLength(2);
  });
});

describe("NATIONAL eligibility behavior", () => {
  const rule = {
    id: "region-rule",
    ruleType: "REGION" as const,
    displayOrder: 1,
    expectedCondition: { coverage: "NATIONAL", cityCode: null },
    required: true,
    reviewRequired: false,
    missingValueBehavior: "UNKNOWN" as const,
    passMessage: "거주지 제한이 없습니다.",
    failureMessage: "거주지 조건을 충족하지 않습니다.",
    unknownMessage: "거주지를 확인해 주세요.",
    sourceId: "source-1",
    sourceLocation: "거주지 요건",
    active: true,
  };
  const context = { applicationType: "ALWAYS_OPEN" as const, applicationStartDate: null, applicationEndDate: null, checkedAt: "2026-07-19" };

  it.each([undefined, "26000", "11000"])("returns PASS regardless of residence city (%s)", (residenceCityCode) => {
    const result = evaluateProgramEligibility({
      rules: [rule],
      input: { evaluationDate: "2026-07-19", residenceCityCode },
      context,
    });
    expect(result).toMatchObject({ status: "ELIGIBLE", executable: true });
    expect(result.ruleResults[0]).toMatchObject({ outcome: "PASS", reasonCode: "NATIONAL_REGION_ALLOWED" });
  });

  it.each([
    [{ coverage: "CITY_WIDE", cityCode: "26000" }, { residenceCityCode: "26000" }, "PASS"],
    [{ coverage: "CITY_WIDE", cityCode: "26000" }, { residenceCityCode: "11000" }, "FAIL"],
    [{ coverage: "CITY_WIDE", cityCode: "26000" }, {}, "UNKNOWN"],
    [{ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26110"] }, { residenceCityCode: "26000", residenceDistrictCode: "26110" }, "PASS"],
    [{ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26110"] }, { residenceCityCode: "26000", residenceDistrictCode: "26140" }, "FAIL"],
    [{ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26110"] }, { residenceCityCode: "26000" }, "UNKNOWN"],
    [{ coverage: "DISTRICT", cityCode: "26000", allowedDistrictCodes: ["26110"] }, { residenceCityCode: "11000" }, "FAIL"],
  ])("preserves local region outcome %#", (expectedCondition, residence, outcome) => {
    const result = evaluateProgramEligibility({ rules: [{ ...rule, expectedCondition }], input: { evaluationDate: "2026-07-19", ...residence }, context });
    expect(result.ruleResults[0]?.outcome).toBe(outcome);
  });
});

describe("NATIONAL hash and publication readiness", () => {
  it("changes the configuration hash when CITY_WIDE becomes NATIONAL", () => {
    const cityWide = createProgramTestRecord();
    const national = createProgramTestRecord();
    national.regions = [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null }];
    expect(calculateProgramConfigurationHash(national)).not.toBe(calculateProgramConfigurationHash(cityWide));
  });

  it("produces the same hash for equivalent records with different version ids", () => {
    const left = createProgramTestRecord();
    const right = { ...createProgramTestRecord(), id: "cloned-version" };
    expect(calculateProgramConfigurationHash(left)).toBe(calculateProgramConfigurationHash(right));
  });

  it("accepts a valid NATIONAL configuration for publication readiness", () => {
    const record = Object.assign(createProgramTestRecord(), {
      regions: [{ coverageType: "NATIONAL" as const, cityCode: null, districtCode: null, reviewRequired: false, requirementNote: null }],
      ruleTestRuns: [] as Array<{ id: string; configurationHash: string; overallPassed: boolean; executedAt: Date }>,
    });
    record.ruleTestRuns.push({ id: "run-1", configurationHash: calculateProgramConfigurationHash(record), overallPassed: true, executedAt: new Date("2026-07-19") });
    const result = buildProgramVersionPublicationReadiness(record);
    expect(result.checks.find(({ code }) => code === "REGION_CONFIGURATION_VALID")?.passed).toBe(true);
    expect(result.ready).toBe(true);
  });
});
