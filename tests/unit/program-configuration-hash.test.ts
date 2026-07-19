import { describe, expect, it } from "vitest";
import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import { createProgramTestRecord } from "../fixtures/program-test-record";

describe("program configuration hash", () => {
  it("같은 구성은 같은 해시를 만든다", () => {
    expect(calculateProgramConfigurationHash(createProgramTestRecord())).toBe(calculateProgramConfigurationHash(createProgramTestRecord()));
  });

  it("DB 배열 반환 순서에 영향받지 않는다", () => {
    const left = createProgramTestRecord();
    const right = createProgramTestRecord();
    right.sources.reverse(); right.regions.reverse(); right.eligibilityRules.reverse(); right.ruleTestCases.reverse();
    expect(calculateProgramConfigurationHash(left)).toBe(calculateProgramConfigurationHash(right));
  });

  it("JSON object key 순서에 영향받지 않는다", () => {
    const left = createProgramTestRecord();
    const right = createProgramTestRecord();
    right.eligibilityRules[0]!.expectedCondition = { referenceDate: "APPLICATION_DATE", maximumAge: 34, minimumAge: 19 };
    expect(calculateProgramConfigurationHash(left)).toBe(calculateProgramConfigurationHash(right));
  });

  it("규칙 기준값 변경 시 해시가 달라진다", () => {
    const changed = createProgramTestRecord();
    changed.eligibilityRules[0]!.expectedCondition = { minimumAge: 20, maximumAge: 34, referenceDate: "APPLICATION_DATE" };
    expect(calculateProgramConfigurationHash(changed)).not.toBe(calculateProgramConfigurationHash(createProgramTestRecord()));
  });

  it("applicationEndDate 변경 시 해시가 달라진다", () => {
    const changed = createProgramTestRecord();
    changed.applicationType = "FIXED_PERIOD";
    changed.applicationStartDate = new Date("2026-07-01");
    changed.applicationEndDate = new Date("2026-07-31");
    expect(calculateProgramConfigurationHash(changed)).not.toBe(calculateProgramConfigurationHash(createProgramTestRecord()));
  });

  it("createdAt과 updatedAt은 해시에 영향이 없다", () => {
    const left = Object.assign(createProgramTestRecord(), { createdAt: new Date("2020-01-01"), updatedAt: new Date("2020-01-01") });
    const right = Object.assign(createProgramTestRecord(), { createdAt: new Date("2030-01-01"), updatedAt: new Date("2030-01-01") });
    expect(calculateProgramConfigurationHash(left)).toBe(calculateProgramConfigurationHash(right));
  });

  it("비활성 규칙은 실행 구성 해시에 포함하지 않는다", () => {
    const changed = createProgramTestRecord();
    changed.eligibilityRules.push({ ...changed.eligibilityRules[0]!, id: "inactive", displayOrder: 9, active: false, expectedCondition: { broken: true } });
    expect(calculateProgramConfigurationHash(changed)).toBe(calculateProgramConfigurationHash(createProgramTestRecord()));
  });
});
