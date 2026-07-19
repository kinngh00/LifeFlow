import { Prisma } from "@/generated/prisma/client";
import { programConfigurationSelect } from "@/features/eligibility/hash/program-configuration-hash";

export const programTestConfigurationSelect = {
  ...programConfigurationSelect,
  publicationStatus: true,
  reviewedAt: true,
  eligibilityRules: {
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      ruleType: true,
      displayOrder: true,
      expectedCondition: true,
      required: true,
      reviewRequired: true,
      missingValueBehavior: true,
      passMessage: true,
      failureMessage: true,
      unknownMessage: true,
      sourceId: true,
      sourceLocation: true,
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
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      inputSnapshot: true,
      expectedOverallStatus: true,
      expectedRuleOutcomes: true,
      requiredForPublish: true,
    },
  },
} as const satisfies Prisma.ProgramVersionSelect;

export type ProgramTestConfigurationRecord = Prisma.ProgramVersionGetPayload<{
  select: typeof programTestConfigurationSelect;
}>;
