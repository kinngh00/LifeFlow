import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { runSerializableTransaction } from "@/server/db/serializable-transaction";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  PublishProgramVersionSchema,
  type PublishProgramVersionInput,
} from "../schemas/program-publication.schema";
import type { PublishProgramVersionResult } from "../types/program-publication.types";
import { buildProgramVersionPublicationReadiness } from "../validators/publication-readiness";
import { getProgramVersionPublicationReadiness } from "./get-program-version-publication-readiness";
import { programTestConfigurationSelect } from "./program-test-configuration.select";

const publicationVersionSelect = {
  ...programTestConfigurationSelect,
  versionNumber: true,
  publishedAt: true,
  program: {
    select: {
      id: true,
      archivedAt: true,
      currentPublishedVersionId: true,
      currentPublishedVersion: {
        select: {
          id: true,
          versionNumber: true,
          publicationStatus: true,
          publishedAt: true,
        },
      },
    },
  },
  ruleTestRuns: {
    orderBy: [{ executedAt: "desc" }, { id: "desc" }],
    take: 1,
    select: { id: true, configurationHash: true, overallPassed: true, executedAt: true },
  },
} as const satisfies Prisma.ProgramVersionSelect;

export function assertProgramVersionCanBePublished(status: string): void {
  if (status === "PUBLISHED") {
    throw new DomainError("PROGRAM_VERSION_ALREADY_PUBLISHED", "이미 게시된 지원제도 버전입니다.");
  }
  if (status !== "DRAFT") {
    throw new DomainError("PROGRAM_VERSION_NOT_PUBLISHABLE", "DRAFT 버전만 게시할 수 있습니다.");
  }
}

export function assertPublicationReadiness(
  readiness: ReturnType<typeof buildProgramVersionPublicationReadiness>,
): void {
  if (readiness.ready) return;
  const failedChecks = readiness.checks.filter(({ passed }) => !passed).map(({ code }) => code);
  if (readiness.latestTestRun && failedChecks.includes("LATEST_TEST_CONFIGURATION_MATCH")) {
    throw new DomainError(
      "TEST_CONFIGURATION_OUTDATED",
      "최근 테스트 이후 구성이 변경되었습니다. 테스트를 다시 실행해 주세요.",
      { failedChecks },
    );
  }
  throw new DomainError(
    "PUBLICATION_READINESS_FAILED",
    "게시 준비 조건을 충족하지 못했습니다.",
    { failedChecks },
  );
}

export async function publishProgramVersion(
  input: PublishProgramVersionInput,
  database: PrismaClient = getDatabaseClient(),
  dependencies: {
    createPublicationEvent?: (
      transaction: Prisma.TransactionClient,
      data: Prisma.PublicationEventUncheckedCreateInput,
    ) => Promise<{ id: string }>;
  } = {},
): Promise<PublishProgramVersionResult> {
  const parsed = parseOrThrow(PublishProgramVersionSchema, input);

  try {
    const preflightAdmin = await database.adminUser.findUnique({
      where: { id: parsed.publishedById },
      select: { active: true },
    });
    if (!preflightAdmin) throw new DomainError("ADMIN_NOT_FOUND", "관리자 계정을 찾을 수 없습니다.");
    if (!preflightAdmin.active) throw new DomainError("ADMIN_INACTIVE", "비활성 관리자는 게시할 수 없습니다.");

    const preflightReadiness = await getProgramVersionPublicationReadiness(
      { programVersionId: parsed.programVersionId },
      database,
    );
    if (!preflightReadiness.ready) {
      const failedChecks = preflightReadiness.checks.filter(({ passed }) => !passed).map(({ code }) => code);
      if (failedChecks.includes("VERSION_IS_DRAFT")) {
        const status = await database.programVersion.findUnique({
          where: { id: parsed.programVersionId },
          select: { publicationStatus: true },
        });
        assertProgramVersionCanBePublished(status?.publicationStatus ?? "MISSING");
      }
      if (
        preflightReadiness.latestTestRun &&
        failedChecks.includes("LATEST_TEST_CONFIGURATION_MATCH")
      ) {
        throw new DomainError(
          "TEST_CONFIGURATION_OUTDATED",
          "최근 테스트 이후 구성이 변경되었습니다. 테스트를 다시 실행해 주세요.",
          { failedChecks },
        );
      }
      throw new DomainError("PUBLICATION_READINESS_FAILED", "게시 준비 조건을 충족하지 못했습니다.", {
        failedChecks,
      });
    }

    const preflight = await database.programVersion.findUnique({
      where: { id: parsed.programVersionId },
      select: { program: { select: { currentPublishedVersionId: true } } },
    });
    if (!preflight) {
      throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");
    }
    const expectedCurrentPublishedVersionId = preflight.program.currentPublishedVersionId;

    return await runSerializableTransaction(database, async (transaction) => {
      const admin = await transaction.adminUser.findUnique({
        where: { id: parsed.publishedById },
        select: { active: true },
      });
      if (!admin) throw new DomainError("ADMIN_NOT_FOUND", "관리자 계정을 찾을 수 없습니다.");
      if (!admin.active) throw new DomainError("ADMIN_INACTIVE", "비활성 관리자는 게시할 수 없습니다.");

      const version = await transaction.programVersion.findUnique({
        where: { id: parsed.programVersionId },
        select: publicationVersionSelect,
      });
      if (!version) throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");
      assertProgramVersionCanBePublished(version.publicationStatus);
      if (version.program.archivedAt) {
        throw new DomainError("PROGRAM_ARCHIVED", "보관된 지원제도는 게시할 수 없습니다.");
      }
      if (version.program.currentPublishedVersionId !== expectedCurrentPublishedVersionId) {
        throw new DomainError(
          "CURRENT_PUBLISHED_VERSION_CONFLICT",
          "게시 준비 확인 후 현재 공개 버전이 변경되었습니다.",
        );
      }

      const readiness = buildProgramVersionPublicationReadiness(version);
      assertPublicationReadiness(readiness);
      if (
        readiness.currentConfigurationHash !== preflightReadiness.currentConfigurationHash ||
        readiness.latestTestRun?.id !== preflightReadiness.latestTestRun?.id
      ) {
        throw new DomainError(
          "TEST_CONFIGURATION_OUTDATED",
          "게시 준비 확인 후 구성 또는 최신 테스트가 변경되었습니다.",
        );
      }

      const previous = version.program.currentPublishedVersion;
      if (previous && previous.publicationStatus !== "PUBLISHED") {
        throw new DomainError(
          "CURRENT_PUBLISHED_VERSION_CONFLICT",
          "현재 공개 버전의 상태가 올바르지 않습니다.",
        );
      }

      if (previous) {
        const unpublished = await transaction.programVersion.updateMany({
          where: { id: previous.id, publicationStatus: "PUBLISHED" },
          data: { publicationStatus: "UNPUBLISHED" },
        });
        if (unpublished.count !== 1) {
          throw new DomainError("CURRENT_PUBLISHED_VERSION_CONFLICT", "기존 공개 버전이 변경되었습니다.");
        }
      }

      const publishedAt = new Date();
      const published = await transaction.programVersion.updateMany({
        where: { id: version.id, programId: version.program.id, publicationStatus: "DRAFT" },
        data: { publicationStatus: "PUBLISHED", publishedAt },
      });
      if (published.count !== 1) {
        throw new DomainError("PROGRAM_VERSION_ALREADY_PUBLISHED", "이미 처리된 게시 요청입니다.");
      }

      const programUpdated = await transaction.supportProgram.updateMany({
        where: {
          id: version.program.id,
          currentPublishedVersionId: expectedCurrentPublishedVersionId,
          archivedAt: null,
        },
        data: { currentPublishedVersionId: version.id },
      });
      if (programUpdated.count !== 1) {
        throw new DomainError(
          "CURRENT_PUBLISHED_VERSION_CONFLICT",
          "현재 공개 버전을 원자적으로 교체하지 못했습니다.",
        );
      }

      const eventData: Prisma.PublicationEventUncheckedCreateInput = {
          programVersionId: version.id,
          eventType: previous ? "VERSION_REPLACED" : "PUBLISHED",
          performedById: parsed.publishedById,
          reason: parsed.reason,
          previousPublishedVersionId: previous?.id ?? null,
          configurationHash: readiness.currentConfigurationHash,
      };
      const event = dependencies.createPublicationEvent
        ? await dependencies.createPublicationEvent(transaction, eventData)
        : await transaction.publicationEvent.create({ data: eventData, select: { id: true } });
      await transaction.adminAuditLog.create({
        data: {
          adminUserId: parsed.publishedById,
          action: "PUBLISH",
          entityType: "ProgramVersion",
          entityId: version.id,
          changeSummary: {
            programId: version.program.id,
            previousPublishedVersionId: previous?.id ?? null,
            configurationHashPrefix: readiness.currentConfigurationHash.slice(0, 12),
            versionNumber: version.versionNumber,
          },
          requestMetadata: Prisma.JsonNull,
        },
      });

      return {
        programId: version.program.id,
        publishedVersion: {
          id: version.id,
          versionNumber: version.versionNumber,
          publicationStatus: "PUBLISHED" as const,
          publishedAt: publishedAt.toISOString(),
        },
        previousPublishedVersion: previous
          ? {
              id: previous.id,
              versionNumber: previous.versionNumber,
              publicationStatus: "UNPUBLISHED" as const,
              publishedAt: previous.publishedAt?.toISOString() ?? null,
            }
          : null,
        currentPublishedVersionId: version.id,
        publicationEventId: event.id,
      };
    });
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
