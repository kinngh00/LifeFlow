import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

export const programConfigurationSelect = {
  id: true,
  amountType: true,
  minimumAmount: true,
  maximumAmount: true,
  applicationType: true,
  applicationStartDate: true,
  applicationEndDate: true,
  checkedAt: true,
  sources: {
    select: {
      sourceType: true,
      organizationName: true,
      documentTitle: true,
      sourceUrl: true,
      documentIdentifier: true,
      publishedAt: true,
      checkedAt: true,
      isPrimary: true,
    },
  },
  regions: {
    select: {
      cityCode: true,
      districtCode: true,
      coverageType: true,
      reviewRequired: true,
      requirementNote: true,
    },
  },
  eligibilityRules: {
    where: { active: true },
    select: {
      ruleType: true,
      displayOrder: true,
      expectedCondition: true,
      required: true,
      reviewRequired: true,
      missingValueBehavior: true,
      active: true,
      source: {
        select: {
          sourceType: true,
          organizationName: true,
          sourceUrl: true,
          documentIdentifier: true,
        },
      },
    },
  },
  ruleTestCases: {
    select: {
      name: true,
      inputSnapshot: true,
      expectedOverallStatus: true,
      expectedRuleOutcomes: true,
      requiredForPublish: true,
    },
  },
} as const satisfies Prisma.ProgramVersionSelect;

export type ProgramConfigurationRecord = Prisma.ProgramVersionGetPayload<{
  select: typeof programConfigurationSelect;
}>;

type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

export function canonicalizeConfiguration(value: unknown): CanonicalValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim().replace(/\s+/gu, " ");
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  if (Array.isArray(value)) {
    return value
      .map(canonicalizeConfiguration)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalizeConfiguration(nested)]),
    );
  }
  throw new TypeError("지원하지 않는 configuration 값입니다.");
}

export function buildProgramConfigurationSnapshot(record: ProgramConfigurationRecord) {
  return canonicalizeConfiguration({
    programVersionId: record.id,
    amountType: record.amountType,
    minimumAmount: record.minimumAmount,
    maximumAmount: record.maximumAmount,
    applicationType: record.applicationType,
    applicationStartDate: record.applicationStartDate,
    applicationEndDate: record.applicationEndDate,
    checkedAt: record.checkedAt,
    sources: record.sources,
    regions: record.regions,
    activeRules: record.eligibilityRules.filter(({ active }) => active),
    testCases: record.ruleTestCases,
  });
}

export function calculateProgramConfigurationHash(
  recordOrSnapshot: ProgramConfigurationRecord | unknown,
): string {
  const snapshot =
    typeof recordOrSnapshot === "object" &&
    recordOrSnapshot !== null &&
    "eligibilityRules" in recordOrSnapshot &&
    "ruleTestCases" in recordOrSnapshot
      ? buildProgramConfigurationSnapshot(recordOrSnapshot as ProgramConfigurationRecord)
      : canonicalizeConfiguration(recordOrSnapshot);
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}
