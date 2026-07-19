import type {
  AmountType,
  ApplicationType,
  ProgramCategory,
  PublicationStatus,
} from "@/generated/prisma/enums";

export type AdminProgramDetail = {
  id: string;
  slug: string;
  category: ProgramCategory;
  managingOrganization: string;
  operatingOrganization: string | null;
  archivedAt: string | null;
  currentPublishedVersionId: string | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    publicationStatus: PublicationStatus;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AdminProgramVersionDetail = {
  id: string;
  programId: string;
  versionNumber: number;
  publicationStatus: PublicationStatus;
  title: string;
  shortDescription: string;
  fullDescription: string;
  targetSummary: string;
  benefitType: string;
  amountType: AmountType;
  minimumAmount: string | null;
  maximumAmount: string | null;
  amountUnit: string | null;
  amountDescription: string | null;
  applicationType: ApplicationType;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  applicationMethod: string;
  applicationUrl: string | null;
  contactInformation: string;
  requiredDocuments: unknown;
  cautionText: string | null;
  checkedAt: string;
  publishedAt: string | null;
  updatedAt: string;
  program: { id: string; slug: string; archivedAt: string | null };
  sources: Array<Record<string, unknown>>;
  regions: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  testCases: Array<Record<string, unknown>>;
};
