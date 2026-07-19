import { Prisma } from "@/generated/prisma/client";
import type {
  AdminProgramListItem,
  AdminProgramVersionSummary,
  CreatedProgramResult,
} from "../types/admin-program.types";

export const programVersionSummarySelect = {
  id: true,
  versionNumber: true,
  title: true,
  publicationStatus: true,
  publishedAt: true,
  updatedAt: true,
} as const satisfies Prisma.ProgramVersionSelect;

export const adminProgramSelect = {
  id: true,
  slug: true,
  category: true,
  managingOrganization: true,
  operatingOrganization: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  currentPublishedVersion: {
    select: programVersionSummarySelect,
  },
  versions: {
    orderBy: { versionNumber: "desc" },
    take: 1,
    select: programVersionSummarySelect,
  },
  _count: {
    select: { versions: true },
  },
} as const satisfies Prisma.SupportProgramSelect;

export type AdminProgramRecord = Prisma.SupportProgramGetPayload<{
  select: typeof adminProgramSelect;
}>;

export type CreatedProgramRecord = Prisma.SupportProgramGetPayload<{
  include: { versions: true };
}>;

function toVersionSummary(
  version: AdminProgramRecord["currentPublishedVersion"],
): AdminProgramVersionSummary | null {
  if (!version) {
    return null;
  }

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    title: version.title,
    publicationStatus: version.publicationStatus,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    updatedAt: version.updatedAt.toISOString(),
  };
}

export function toAdminProgramListItem(
  program: AdminProgramRecord,
): AdminProgramListItem {
  return {
    id: program.id,
    slug: program.slug,
    category: program.category,
    managingOrganization: program.managingOrganization,
    operatingOrganization: program.operatingOrganization,
    archivedAt: program.archivedAt?.toISOString() ?? null,
    currentPublishedVersion: toVersionSummary(program.currentPublishedVersion),
    latestVersion: toVersionSummary(program.versions[0] ?? null),
    versionCount: program._count.versions,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

export function toCreatedProgramResult(
  program: CreatedProgramRecord,
): CreatedProgramResult {
  const version = program.versions[0];

  if (!version) {
    throw new Error("Initial version was not loaded");
  }

  return {
    program: {
      id: program.id,
      slug: program.slug,
      category: program.category,
      managingOrganization: program.managingOrganization,
      operatingOrganization: program.operatingOrganization,
      currentPublishedVersionId: null,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    },
    initialVersion: {
      id: version.id,
      programId: version.programId,
      versionNumber: 1,
      title: version.title,
      publicationStatus: "DRAFT",
      amountType: version.amountType,
      minimumAmount: version.minimumAmount?.toString() ?? null,
      maximumAmount: version.maximumAmount?.toString() ?? null,
      applicationType: version.applicationType,
      applicationStartDate:
        version.applicationStartDate?.toISOString().slice(0, 10) ?? null,
      applicationEndDate:
        version.applicationEndDate?.toISOString().slice(0, 10) ?? null,
      reviewedAt: null,
      publishedAt: null,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    },
  };
}

export function toPrismaDecimal(value: string | null | undefined) {
  return value ? new Prisma.Decimal(value) : null;
}

export function toDatabaseDate(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
