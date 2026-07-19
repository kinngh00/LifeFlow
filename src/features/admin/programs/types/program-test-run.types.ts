import type { EligibilityStatus } from "@/generated/prisma/enums";

export type ProgramTestRunResultItem = {
  testCaseId: string;
  name: string;
  expectedStatus: EligibilityStatus;
  actualStatus: EligibilityStatus;
  passed: boolean;
  failureReasons: string[];
};

export type ProgramTestRunResult = {
  testRunId: string;
  programVersionId: string;
  configurationHash: string;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  overallPassed: boolean;
  results: ProgramTestRunResultItem[];
  executedAt: string;
};

export type PublicationReadinessCheckCode =
  | "VERSION_IS_DRAFT"
  | "PRIMARY_SOURCE_PRESENT"
  | "SOURCE_PRESENT"
  | "REGION_PRESENT"
  | "REQUIRED_RULE_PRESENT"
  | "RULE_SOURCES_VALID"
  | "TEST_CASE_PRESENT"
  | "REQUIRED_TEST_CASE_PRESENT"
  | "LATEST_TEST_PRESENT"
  | "LATEST_TEST_CONFIGURATION_MATCH"
  | "LATEST_TEST_PASSED"
  | "CHECKED_AT_PRESENT"
  | "APPLICATION_PERIOD_CONSISTENT"
  | "PRIMARY_SOURCE_URL_VALID";

export type PublicationReadinessResult = {
  programVersionId: string;
  ready: boolean;
  currentConfigurationHash: string;
  latestTestRun: {
    id: string;
    configurationHash: string;
    overallPassed: boolean;
    executedAt: string;
  } | null;
  checks: Array<{
    code: PublicationReadinessCheckCode;
    passed: boolean;
    message: string;
  }>;
};
