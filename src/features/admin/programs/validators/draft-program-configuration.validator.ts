import { DomainError } from "@/server/errors/domain-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  UpdateDraftProgramConfigurationSchema,
  type ParsedDraftProgramConfiguration,
  type UpdateDraftProgramConfigurationInput,
} from "../schemas/update-draft-program-configuration.schema";
import {
  BUSAN_CITY_CODE,
  busanDistrictCodeSet,
} from "./busan-region.constants";
import { findProhibitedPersonalDataKey } from "./personal-data-keys";

function validationError(message: string, details?: unknown): never {
  throw new DomainError("VALIDATION_ERROR", message, details);
}

export type ValidatableProgramRegion = {
  coverageType: "NATIONAL" | "CITY_WIDE" | "DISTRICT";
  cityCode: string | null;
  districtCode: string | null;
  reviewRequired: boolean;
  requirementNote?: string | null;
};

export function assertValidProgramRegions(
  regions: ValidatableProgramRegion[],
): void {
  const coverageTypes = new Set(regions.map(({ coverageType }) => coverageType));
  if (coverageTypes.size > 1) {
    throw new DomainError(
      "REGION_CONFLICT",
      "전국, 부산 전체, 개별 구·군 범위를 서로 혼합할 수 없습니다.",
    );
  }

  const regionKeys = new Set<string>();
  for (const region of regions) {
    if (region.coverageType === "NATIONAL") {
      if (region.cityCode !== null || region.districtCode !== null) {
        throw new DomainError(
          "REGION_CONFLICT",
          "부산 거주 필수가 아닌 범위에는 도시·구·군 코드를 입력하지 않습니다.",
        );
      }
    } else {
      if (region.cityCode !== BUSAN_CITY_CODE) {
        validationError("부산광역시 지역 코드만 허용합니다.");
      }
      if (region.coverageType === "CITY_WIDE" && region.districtCode !== "ALL") {
        throw new DomainError(
          "REGION_CONFLICT",
          "부산 전체 지역의 districtCode는 ALL이어야 합니다.",
        );
      }
      if (
        region.coverageType === "DISTRICT" &&
        (!region.districtCode || !busanDistrictCodeSet.has(region.districtCode))
      ) {
        validationError("허용되지 않은 부산 구·군 코드입니다.");
      }
    }

    if (region.reviewRequired && !region.requirementNote?.trim()) {
      validationError("추가 확인 지역에는 확인 메모가 필요합니다.");
    }

    const key = `${region.coverageType}:${region.cityCode ?? "NULL"}:${region.districtCode ?? "NULL"}`;
    if (regionKeys.has(key)) validationError("중복된 적용 지역이 있습니다.");
    regionKeys.add(key);
  }
}

export function hasValidProgramRegions(
  regions: ValidatableProgramRegion[],
): boolean {
  try {
    assertValidProgramRegions(regions);
    return true;
  } catch {
    return false;
  }
}

export function parseDraftProgramConfiguration(
  input: UpdateDraftProgramConfigurationInput,
): ParsedDraftProgramConfiguration {
  const value = parseOrThrow(UpdateDraftProgramConfigurationSchema, input);
  const primaryCount = value.sources.filter(({ isPrimary }) => isPrimary).length;
  if (primaryCount === 0) {
    throw new DomainError("PRIMARY_SOURCE_REQUIRED", "대표 출처가 정확히 1개 필요합니다.");
  }
  if (primaryCount > 1) {
    throw new DomainError("MULTIPLE_PRIMARY_SOURCES", "대표 출처는 하나만 등록할 수 있습니다.");
  }

  const urls = value.sources.map(({ sourceUrl }) => new URL(sourceUrl).href);
  if (new Set(urls).size !== urls.length) validationError("중복된 출처 URL이 있습니다.");
  const identifiers = value.sources
    .map(({ documentIdentifier }) => documentIdentifier)
    .filter((identifier): identifier is string => Boolean(identifier));
  if (new Set(identifiers).size !== identifiers.length) {
    validationError("중복된 문서 식별자가 있습니다.");
  }

  assertValidProgramRegions(value.regions);

  const orders = value.rules.map(({ displayOrder }) => displayOrder);
  if (!orders.includes(1)) validationError("규칙 displayOrder는 1부터 시작해야 합니다.");
  if (new Set(orders).size !== orders.length) validationError("규칙 displayOrder가 중복되었습니다.");
  for (const rule of value.rules) {
    if (rule.sourceReference.sourceIndex >= value.sources.length) {
      throw new DomainError("RULE_SOURCE_REFERENCE_INVALID", "규칙이 존재하지 않는 출처를 참조합니다.");
    }
  }

  const names = value.testCases.map(({ name }) => name);
  if (new Set(names).size !== names.length) validationError("테스트 사례 이름이 중복되었습니다.");
  if (!value.testCases.some(({ requiredForPublish }) => requiredForPublish)) {
    validationError("게시 필수 테스트 사례가 최소 1개 필요합니다.");
  }
  const orderSet = new Set(orders);
  for (const testCase of value.testCases) {
    if (
      Object.keys(testCase.inputSnapshot).length === 0 &&
      testCase.expectedOverallStatus !== "UNDETERMINED"
    ) {
      validationError("빈 입력은 정보 누락을 기대하는 UNDETERMINED 사례에만 허용됩니다.");
    }
    const prohibitedKey = findProhibitedPersonalDataKey(testCase.inputSnapshot);
    if (prohibitedKey) validationError("테스트 입력에 개인정보 필드를 사용할 수 없습니다.", { key: prohibitedKey });
    const referencedOrders = testCase.expectedRuleOutcomes.map(({ displayOrder }) => displayOrder);
    if (new Set(referencedOrders).size !== referencedOrders.length) {
      validationError("테스트 사례의 규칙 참조가 중복되었습니다.");
    }
    if (referencedOrders.some((order) => !orderSet.has(order))) {
      throw new DomainError("TEST_RULE_REFERENCE_INVALID", "테스트 사례가 존재하지 않는 규칙을 참조합니다.");
    }
  }

  return value;
}
