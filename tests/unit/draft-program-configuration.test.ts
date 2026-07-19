import { describe, expect, it } from "vitest";
import { parseDraftProgramConfiguration } from "@/features/admin/programs/validators/draft-program-configuration.validator";
import { createValidDraftConfiguration } from "../fixtures/draft-program-configuration";

function expectCode(input: unknown, code: string) {
  expect(() => parseDraftProgramConfiguration(input as never)).toThrow(
    expect.objectContaining({ code }),
  );
}

describe("draft program configuration validation", () => {
  it("대표 출처가 없으면 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.sources[0]!.isPrimary = false;
    expectCode(input, "PRIMARY_SOURCE_REQUIRED");
  });

  it("대표 출처가 둘이면 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.sources.push({ ...input.sources[0]!, sourceUrl: "https://www.busan.go.kr/second" });
    expectCode(input, "MULTIPLE_PRIMARY_SOURCES");
  });

  it("중복 URL을 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.sources.push({ ...input.sources[0]!, isPrimary: false });
    expectCode(input, "VALIDATION_ERROR");
  });

  it("부산 CITY_WIDE 구조를 허용한다", () => {
    expect(parseDraftProgramConfiguration(createValidDraftConfiguration()).regions[0]).toMatchObject({ districtCode: "ALL" });
  });

  it("허용된 부산 DISTRICT 구조를 허용한다", () => {
    const input = createValidDraftConfiguration();
    input.regions = [{ cityCode: "26000", districtCode: "26110", coverageType: "DISTRICT", reviewRequired: false }];
    expect(parseDraftProgramConfiguration(input).regions[0]).toMatchObject({ districtCode: "26110" });
  });

  it("CITY_WIDE와 DISTRICT 동시 등록을 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.regions.push({ cityCode: "26000", districtCode: "26110", coverageType: "DISTRICT", reviewRequired: false });
    expectCode(input, "REGION_CONFLICT");
  });

  it("displayOrder 중복을 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.rules.push({ ...input.rules[0]!, label: "중복 규칙" });
    expectCode(input, "VALIDATION_ERROR");
  });

  it("존재하지 않는 sourceReference를 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.rules[0]!.sourceReference.sourceIndex = 1;
    expectCode(input, "RULE_SOURCE_REFERENCE_INVALID");
  });

  it("테스트 사례의 존재하지 않는 규칙 참조를 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.testCases[0]!.expectedRuleOutcomes[0]!.displayOrder = 2;
    expectCode(input, "TEST_RULE_REFERENCE_INVALID");
  });

  it("중첩된 개인정보 금지 키를 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.testCases[0]!.inputSnapshot = { profile: { email: "person@example.com" } };
    expectCode(input, "VALIDATION_ERROR");
  });

  it("requiredForPublish 테스트가 없으면 거부한다", () => {
    const input = createValidDraftConfiguration();
    input.testCases[0]!.requiredForPublish = false;
    expectCode(input, "VALIDATION_ERROR");
  });

  it("MANUAL_REVIEW는 reviewRequired를 강제한다", () => {
    const input = createValidDraftConfiguration();
    input.rules = [{
      ...input.rules[0]!,
      ruleType: "MANUAL_REVIEW",
      reviewRequired: false,
      expectedCondition: { reviewPrompt: "서류를 확인하세요." },
    }];
    expectCode(input, "VALIDATION_ERROR");
  });
});
