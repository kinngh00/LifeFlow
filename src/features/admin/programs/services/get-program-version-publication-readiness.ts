import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  ProgramVersionPublicationReadinessSchema,
  type ProgramVersionPublicationReadinessInput,
} from "../schemas/run-program-version-tests.schema";
import type { PublicationReadinessResult } from "../types/program-test-run.types";
import { buildProgramVersionPublicationReadiness } from "../validators/publication-readiness";
import { programTestConfigurationSelect } from "./program-test-configuration.select";

export async function getProgramVersionPublicationReadiness(
  input: ProgramVersionPublicationReadinessInput,
  database: PrismaClient = getDatabaseClient(),
): Promise<PublicationReadinessResult> {
  const parsed = parseOrThrow(ProgramVersionPublicationReadinessSchema, input);
  try {
    const version = await database.programVersion.findUnique({
      where: { id: parsed.programVersionId },
      select: {
        ...programTestConfigurationSelect,
        ruleTestRuns: {
          orderBy: [{ executedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, configurationHash: true, overallPassed: true, executedAt: true },
        },
      },
    });
    if (!version) throw new DomainError("PROGRAM_VERSION_NOT_FOUND", "지원제도 버전을 찾을 수 없습니다.");

    return buildProgramVersionPublicationReadiness(version);
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
