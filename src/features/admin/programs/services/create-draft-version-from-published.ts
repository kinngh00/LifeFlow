import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { runSerializableTransaction } from "@/server/db/serializable-transaction";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  CreateDraftVersionFromPublishedSchema,
  type CreateDraftVersionFromPublishedInput,
} from "../schemas/program-publication.schema";
import type { CreateDraftVersionResult } from "../types/program-publication.types";

const sourceVersionSelect = {
  id: true,
  programId: true,
  title: true,
  shortDescription: true,
  fullDescription: true,
  targetSummary: true,
  benefitType: true,
  amountType: true,
  minimumAmount: true,
  maximumAmount: true,
  amountUnit: true,
  amountDescription: true,
  applicationType: true,
  applicationStartDate: true,
  applicationEndDate: true,
  applicationMethod: true,
  applicationUrl: true,
  contactInformation: true,
  requiredDocuments: true,
  cautionText: true,
  checkedAt: true,
  reviewDueAt: true,
  publicationStatus: true,
  sources: true,
  regions: true,
  eligibilityRules: { orderBy: { displayOrder: "asc" } },
  ruleTestCases: { orderBy: { name: "asc" } },
} as const satisfies Prisma.ProgramVersionSelect;

function isVersionNumberConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = error.meta?.target;
  return (
    (Array.isArray(target) && target.includes("programId") && target.includes("versionNumber")) ||
    (typeof target === "string" && target.includes("versionNumber"))
  );
}

type VersionPolicyRecord = { id: string; versionNumber: number; publicationStatus: string };

export function getNextVersionNumber(versions: VersionPolicyRecord[]): number {
  return versions.reduce((maximum, version) => Math.max(maximum, version.versionNumber), 0) + 1;
}

export function getExistingDraft(versions: VersionPolicyRecord[]): VersionPolicyRecord | null {
  return versions.find(({ publicationStatus }) => publicationStatus === "DRAFT") ?? null;
}

export function resolveDraftSourceVersionId(
  requestedSourceVersionId: string | undefined,
  currentPublishedVersionId: string | null,
): string {
  const sourceVersionId = requestedSourceVersionId ?? currentPublishedVersionId;
  if (!sourceVersionId) {
    throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "복제할 현재 공개 버전이 없습니다.");
  }
  return sourceVersionId;
}

export function assertDraftSourceVersion(
  source: { programId: string; publicationStatus: string },
  programId: string,
): void {
  if (source.programId !== programId) {
    throw new DomainError("SOURCE_VERSION_NOT_IN_PROGRAM", "복제 기준 버전이 해당 지원제도 소속이 아닙니다.");
  }
  if (!new Set(["PUBLISHED", "UNPUBLISHED"]).has(source.publicationStatus)) {
    throw new DomainError("PROGRAM_VERSION_NOT_PUBLISHABLE", "게시 이력이 있는 버전만 복제할 수 있습니다.");
  }
}

export async function createDraftVersionFromPublished(
  input: CreateDraftVersionFromPublishedInput,
  database: PrismaClient = getDatabaseClient(),
  dependencies: {
    createEligibilityRule?: (
      transaction: Prisma.TransactionClient,
      data: Prisma.EligibilityRuleUncheckedCreateInput,
    ) => Promise<unknown>;
  } = {},
): Promise<CreateDraftVersionResult> {
  const parsed = parseOrThrow(CreateDraftVersionFromPublishedSchema, input);

  try {
    return await runSerializableTransaction(database, async (transaction) => {
      const admin = await transaction.adminUser.findUnique({
        where: { id: parsed.createdById },
        select: { active: true },
      });
      if (!admin) throw new DomainError("ADMIN_NOT_FOUND", "관리자 계정을 찾을 수 없습니다.");
      if (!admin.active) throw new DomainError("ADMIN_INACTIVE", "비활성 관리자는 DRAFT를 생성할 수 없습니다.");

      const program = await transaction.supportProgram.findUnique({
        where: { id: parsed.programId },
        select: {
          id: true,
          archivedAt: true,
          currentPublishedVersionId: true,
          versions: {
            select: { id: true, versionNumber: true, publicationStatus: true },
            orderBy: { versionNumber: "desc" },
          },
        },
      });
      if (!program) throw new DomainError("PROGRAM_NOT_FOUND", "지원제도를 찾을 수 없습니다.");
      if (program.archivedAt) throw new DomainError("PROGRAM_ARCHIVED", "보관된 지원제도는 DRAFT를 생성할 수 없습니다.");

      const existingDraft = getExistingDraft(program.versions);
      if (existingDraft) {
        throw new DomainError(
          "DRAFT_VERSION_ALREADY_EXISTS",
          "이미 편집 가능한 DRAFT 버전이 있습니다.",
          { draftVersionId: existingDraft.id },
        );
      }

      const sourceVersionId = resolveDraftSourceVersionId(
        parsed.sourceVersionId,
        program.currentPublishedVersionId,
      );
      const source = await transaction.programVersion.findUnique({
        where: { id: sourceVersionId },
        select: sourceVersionSelect,
      });
      if (!source) throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "복제 기준 버전을 찾을 수 없습니다.");
      assertDraftSourceVersion(source, program.id);

      const versionNumber = getNextVersionNumber(program.versions);
      const draft = await transaction.programVersion.create({
        data: {
          programId: program.id,
          versionNumber,
          title: source.title,
          shortDescription: source.shortDescription,
          fullDescription: source.fullDescription,
          targetSummary: source.targetSummary,
          benefitType: source.benefitType,
          amountType: source.amountType,
          minimumAmount: source.minimumAmount,
          maximumAmount: source.maximumAmount,
          amountUnit: source.amountUnit,
          amountDescription: source.amountDescription,
          applicationType: source.applicationType,
          applicationStartDate: source.applicationStartDate,
          applicationEndDate: source.applicationEndDate,
          applicationMethod: source.applicationMethod,
          applicationUrl: source.applicationUrl,
          contactInformation: source.contactInformation,
          requiredDocuments: source.requiredDocuments as Prisma.InputJsonValue,
          cautionText: source.cautionText,
          checkedAt: source.checkedAt,
          reviewDueAt: source.reviewDueAt,
          publicationStatus: "DRAFT",
          publishedAt: null,
          reviewedAt: null,
          supersedesVersionId: source.id,
          createdById: parsed.createdById,
        },
        select: { id: true },
      });

      const sourceIdMap = new Map<string, string>();
      for (const item of source.sources) {
        const cloned = await transaction.programSource.create({
          data: {
            programVersionId: draft.id,
            sourceType: item.sourceType,
            organizationName: item.organizationName,
            documentTitle: item.documentTitle,
            sourceUrl: item.sourceUrl,
            documentIdentifier: item.documentIdentifier,
            publishedAt: item.publishedAt,
            checkedAt: item.checkedAt,
            isPrimary: item.isPrimary,
            note: item.note,
          },
          select: { id: true },
        });
        sourceIdMap.set(item.id, cloned.id);
      }

      if (source.regions.length > 0) {
        await transaction.programRegion.createMany({
          data: source.regions.map((region) => ({
            programVersionId: draft.id,
            cityCode: region.cityCode,
            districtCode: region.districtCode,
            coverageType: region.coverageType,
            reviewRequired: region.reviewRequired,
            requirementNote: region.requirementNote,
          })),
        });
      }

      for (const rule of source.eligibilityRules) {
        const clonedSourceId = rule.sourceId ? sourceIdMap.get(rule.sourceId) : undefined;
        if (!clonedSourceId) {
          throw new DomainError(
            "RULE_SOURCE_REFERENCE_INVALID",
            "원본 규칙의 출처 연결이 불완전하여 DRAFT를 복제할 수 없습니다.",
          );
        }
        const ruleData: Prisma.EligibilityRuleUncheckedCreateInput = {
            programVersionId: draft.id,
            ruleType: rule.ruleType,
            displayOrder: rule.displayOrder,
            label: rule.label,
            description: rule.description,
            expectedCondition: rule.expectedCondition as Prisma.InputJsonValue,
            required: rule.required,
            reviewRequired: rule.reviewRequired,
            missingValueBehavior: rule.missingValueBehavior,
            passMessage: rule.passMessage,
            failureMessage: rule.failureMessage,
            unknownMessage: rule.unknownMessage,
            sourceId: clonedSourceId,
            sourceLocation: rule.sourceLocation,
            active: rule.active,
        };
        if (dependencies.createEligibilityRule) {
          await dependencies.createEligibilityRule(transaction, ruleData);
        } else {
          await transaction.eligibilityRule.create({ data: ruleData });
        }
      }

      for (const testCase of source.ruleTestCases) {
        await transaction.ruleTestCase.create({
          data: {
            programVersionId: draft.id,
            name: testCase.name,
            description: testCase.description,
            inputSnapshot: testCase.inputSnapshot as Prisma.InputJsonValue,
            expectedOverallStatus: testCase.expectedOverallStatus,
            expectedRuleOutcomes: testCase.expectedRuleOutcomes as Prisma.InputJsonValue,
            requiredForPublish: testCase.requiredForPublish,
            createdById: parsed.createdById,
          },
        });
      }

      await transaction.adminAuditLog.create({
        data: {
          adminUserId: parsed.createdById,
          action: "CREATE",
          entityType: "ProgramVersion",
          entityId: draft.id,
          changeSummary: {
            programId: program.id,
            sourceVersionId: source.id,
            versionNumber,
            sourceCount: source.sources.length,
            regionCount: source.regions.length,
            ruleCount: source.eligibilityRules.length,
            testCaseCount: source.ruleTestCases.length,
          },
          requestMetadata: Prisma.JsonNull,
        },
      });

      return {
        programId: program.id,
        sourceVersionId: source.id,
        draftVersion: {
          id: draft.id,
          versionNumber,
          publicationStatus: "DRAFT" as const,
          sourceCount: source.sources.length,
          regionCount: source.regions.length,
          ruleCount: source.eligibilityRules.length,
          testCaseCount: source.ruleTestCases.length,
        },
      };
    });
  } catch (error) {
    if (isVersionNumberConflict(error)) {
      throw new DomainError("VERSION_NUMBER_CONFLICT", "새 DRAFT 버전 번호가 동시 요청과 충돌했습니다.");
    }
    throw toDatabaseDomainError(error);
  }
}
