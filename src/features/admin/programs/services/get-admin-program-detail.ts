/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import type {
  AdminProgramDetail,
  AdminProgramVersionDetail,
} from "../types/admin-program-detail.types";

function dateOnly(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

export async function getAdminProgramDetail(
  programId: string,
  database: PrismaClient = getDatabaseClient(),
): Promise<AdminProgramDetail> {
  try {
    const program = await database.supportProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        slug: true,
        category: true,
        managingOrganization: true,
        operatingOrganization: true,
        archivedAt: true,
        currentPublishedVersionId: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          select: {
            id: true,
            versionNumber: true,
            title: true,
            publicationStatus: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!program) throw new DomainError("PROGRAM_NOT_FOUND", "지원제도를 찾을 수 없습니다.");
    return {
      ...program,
      archivedAt: program.archivedAt?.toISOString() ?? null,
      versions: program.versions.map((version) => ({
        ...version,
        publishedAt: version.publishedAt?.toISOString() ?? null,
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}

export async function getAdminProgramVersionDetail(
  programVersionId: string,
  database: PrismaClient = getDatabaseClient(),
): Promise<AdminProgramVersionDetail> {
  try {
    const version = await database.programVersion.findUnique({
      where: { id: programVersionId },
      include: {
        program: { select: { id: true, slug: true, archivedAt: true } },
        sources: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        regions: { orderBy: [{ coverageType: "asc" }, { districtCode: "asc" }] },
        eligibilityRules: { orderBy: { displayOrder: "asc" } },
        ruleTestCases: { orderBy: { name: "asc" } },
      },
    });
    if (!version) throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");
    return {
      id: version.id,
      programId: version.programId,
      versionNumber: version.versionNumber,
      publicationStatus: version.publicationStatus,
      title: version.title,
      shortDescription: version.shortDescription,
      fullDescription: version.fullDescription,
      targetSummary: version.targetSummary,
      benefitType: version.benefitType,
      amountType: version.amountType,
      minimumAmount: version.minimumAmount?.toString() ?? null,
      maximumAmount: version.maximumAmount?.toString() ?? null,
      amountUnit: version.amountUnit,
      amountDescription: version.amountDescription,
      applicationType: version.applicationType,
      applicationStartDate: dateOnly(version.applicationStartDate),
      applicationEndDate: dateOnly(version.applicationEndDate),
      applicationMethod: version.applicationMethod,
      applicationUrl: version.applicationUrl,
      contactInformation: version.contactInformation,
      requiredDocuments: version.requiredDocuments,
      cautionText: version.cautionText,
      checkedAt: dateOnly(version.checkedAt)!,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      updatedAt: version.updatedAt.toISOString(),
      program: {
        ...version.program,
        archivedAt: version.program.archivedAt?.toISOString() ?? null,
      },
      sources: version.sources.map(({ id: _id, programVersionId: _versionId, createdAt: _createdAt, updatedAt: _updatedAt, ...source }) => ({
        ...source,
        publishedAt: dateOnly(source.publishedAt),
        checkedAt: dateOnly(source.checkedAt),
      })),
      regions: version.regions.map(({ id: _id, programVersionId: _versionId, ...region }) => region),
      rules: version.eligibilityRules.map(({ id: _id, programVersionId: _versionId, sourceId, createdAt: _createdAt, updatedAt: _updatedAt, ...rule }) => ({
        ...rule,
        sourceIndex: version.sources.findIndex(({ id }) => id === sourceId),
      })),
      testCases: version.ruleTestCases.map(({ id: _id, programVersionId: _versionId, createdById: _createdById, createdAt: _createdAt, updatedAt: _updatedAt, ...testCase }) => testCase),
    } satisfies AdminProgramVersionDetail;
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
