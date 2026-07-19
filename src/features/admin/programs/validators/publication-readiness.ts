import { calculateProgramConfigurationHash } from "@/features/eligibility/hash/program-configuration-hash";
import type { ProgramTestConfigurationRecord } from "../services/program-test-configuration.select";
import type {
  PublicationReadinessCheckCode,
  PublicationReadinessResult,
} from "../types/program-test-run.types";

export type PublicationReadinessRecord = ProgramTestConfigurationRecord & {
  ruleTestRuns: Array<{
    id: string;
    configurationHash: string;
    overallPassed: boolean;
    executedAt: Date;
  }>;
};

function validHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function buildProgramVersionPublicationReadiness(
  version: PublicationReadinessRecord,
): PublicationReadinessResult {
  const currentConfigurationHash = calculateProgramConfigurationHash(version);
  const latest = version.ruleTestRuns[0] ?? null;
  const primarySources = version.sources.filter(({ isPrimary }) => isPrimary);
  const activeRequiredRules = version.eligibilityRules.filter(({ active, required }) => active && required);
  const applicationConsistent =
    version.applicationType === "FIXED_PERIOD"
      ? Boolean(version.applicationStartDate && version.applicationEndDate && version.applicationStartDate <= version.applicationEndDate)
      : version.applicationType === "ALWAYS_OPEN"
        ? !version.applicationStartDate && !version.applicationEndDate
        : !version.applicationEndDate;

  const definitions: Array<[PublicationReadinessCheckCode, boolean, string]> = [
    ["VERSION_IS_DRAFT", version.publicationStatus === "DRAFT", "버전이 DRAFT 상태입니다."],
    ["PRIMARY_SOURCE_PRESENT", primarySources.length === 1, "대표 공식 출처가 정확히 1개 등록되어 있습니다."],
    ["SOURCE_PRESENT", version.sources.length > 0, "공식 출처가 등록되어 있습니다."],
    ["REGION_PRESENT", version.regions.length > 0, "적용 지역이 등록되어 있습니다."],
    ["REQUIRED_RULE_PRESENT", activeRequiredRules.length > 0, "활성 필수 규칙이 등록되어 있습니다."],
    ["RULE_SOURCES_VALID", version.eligibilityRules.filter(({ active }) => active).every(({ source }) => Boolean(source)), "모든 활성 규칙이 출처와 연결되어 있습니다."],
    ["TEST_CASE_PRESENT", version.ruleTestCases.length > 0, "규칙 테스트 사례가 등록되어 있습니다."],
    ["REQUIRED_TEST_CASE_PRESENT", version.ruleTestCases.some(({ requiredForPublish }) => requiredForPublish), "게시 필수 테스트 사례가 등록되어 있습니다."],
    ["LATEST_TEST_PRESENT", Boolean(latest), "최근 테스트 실행이 존재합니다."],
    ["LATEST_TEST_CONFIGURATION_MATCH", latest?.configurationHash === currentConfigurationHash, "최근 테스트가 현재 구성과 일치합니다."],
    ["LATEST_TEST_PASSED", latest?.overallPassed === true, "최근 테스트 실행을 모두 통과했습니다."],
    ["CHECKED_AT_PRESENT", Boolean(version.checkedAt), "공식 정보 확인일이 등록되어 있습니다."],
    ["APPLICATION_PERIOD_CONSISTENT", applicationConsistent, "신청 유형과 신청 기간이 일관됩니다."],
    ["PRIMARY_SOURCE_URL_VALID", primarySources.length === 1 && validHttpUrl(primarySources[0]?.sourceUrl), "대표 출처 URL이 유효합니다."],
  ];

  const checks = definitions.map(([code, passed, successMessage]) => ({
    code,
    passed,
    message: passed ? successMessage : `${successMessage.replace(/(입니다|있습니다)\.$/, "")} 조건을 충족하지 않습니다.`,
  }));
  return {
    programVersionId: version.id,
    ready: checks.every(({ passed }) => passed),
    currentConfigurationHash,
    latestTestRun: latest
      ? { id: latest.id, configurationHash: latest.configurationHash, overallPassed: latest.overallPassed, executedAt: latest.executedAt.toISOString() }
      : null,
    checks,
  };
}
