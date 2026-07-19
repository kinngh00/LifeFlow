import { Prisma } from "@/generated/prisma/client";
import type { UpdatedDraftProgramConfigurationResult } from "../types/draft-program-configuration.types";

export const draftConfigurationResultSelect = {
  id: true,
  publicationStatus: true,
  updatedAt: true,
  sources: {
    where: { isPrimary: true },
    take: 1,
    select: { id: true, organizationName: true, sourceUrl: true },
  },
  _count: {
    select: {
      sources: true,
      regions: true,
      eligibilityRules: true,
      ruleTestCases: true,
    },
  },
} as const satisfies Prisma.ProgramVersionSelect;

export type DraftConfigurationResultRecord = Prisma.ProgramVersionGetPayload<{
  select: typeof draftConfigurationResultSelect;
}>;

export function toUpdatedDraftConfigurationResult(
  record: DraftConfigurationResultRecord,
): UpdatedDraftProgramConfigurationResult {
  const primarySource = record.sources[0];
  if (!primarySource || record.publicationStatus !== "DRAFT") {
    throw new Error("Draft configuration result is incomplete");
  }

  return {
    programVersionId: record.id,
    publicationStatus: "DRAFT",
    sourceCount: record._count.sources,
    regionCount: record._count.regions,
    ruleCount: record._count.eligibilityRules,
    testCaseCount: record._count.ruleTestCases,
    primarySource,
    updatedAt: record.updatedAt.toISOString(),
    configurationChanged: true,
  };
}
