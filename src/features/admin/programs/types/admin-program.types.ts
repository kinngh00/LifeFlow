import type {
  ProgramCategory,
  PublicationStatus,
  AmountType,
  ApplicationType,
} from "@/generated/prisma/enums";

export type AdminProgramVersionSummary = {
  id: string;
  versionNumber: number;
  title: string;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminProgramListItem = {
  id: string;
  slug: string;
  category: ProgramCategory;
  managingOrganization: string;
  operatingOrganization: string | null;
  archivedAt: string | null;
  currentPublishedVersion: AdminProgramVersionSummary | null;
  latestVersion: AdminProgramVersionSummary | null;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminProgramListResult = {
  items: AdminProgramListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreatedProgramResult = {
  program: {
    id: string;
    slug: string;
    category: ProgramCategory;
    managingOrganization: string;
    operatingOrganization: string | null;
    currentPublishedVersionId: null;
    createdAt: string;
    updatedAt: string;
  };
  initialVersion: {
    id: string;
    programId: string;
    versionNumber: 1;
    title: string;
    publicationStatus: "DRAFT";
    amountType: AmountType;
    minimumAmount: string | null;
    maximumAmount: string | null;
    applicationType: ApplicationType;
    applicationStartDate: string | null;
    applicationEndDate: string | null;
    reviewedAt: null;
    publishedAt: null;
    createdAt: string;
    updatedAt: string;
  };
};
