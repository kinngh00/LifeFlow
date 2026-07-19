import {
  Prisma,
  type PrismaClient,
  type ProgramVersion,
} from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { DomainError } from "@/server/errors/domain-error";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  CreateProgramWithInitialVersionSchema,
  type CreateProgramWithInitialVersionInput,
} from "../schemas/create-program.schema";
import {
  toCreatedProgramResult,
  toDatabaseDate,
  toPrismaDecimal,
} from "../mappers/admin-program.mapper";
import type { CreatedProgramResult } from "../types/admin-program.types";

type CreateVersion = (
  transaction: Prisma.TransactionClient,
  data: Prisma.ProgramVersionCreateInput,
) => Promise<ProgramVersion>;

export type CreateProgramDependencies = {
  database?: PrismaClient;
  createVersion?: CreateVersion;
};

const createVersionWithPrisma: CreateVersion = (transaction, data) =>
  transaction.programVersion.create({ data });

export async function createProgramWithInitialVersion(
  input: CreateProgramWithInitialVersionInput,
  dependencies: CreateProgramDependencies = {},
): Promise<CreatedProgramResult> {
  const parsed = parseOrThrow(CreateProgramWithInitialVersionSchema, input);
  const database = dependencies.database ?? getDatabaseClient();
  const createVersion = dependencies.createVersion ?? createVersionWithPrisma;

  try {
    const program = await database.$transaction(
      async (transaction) => {
        const admin = await transaction.adminUser.findUnique({
          where: { id: parsed.createdById },
          select: { active: true },
        });

        if (!admin) {
          throw new DomainError(
            "ADMIN_NOT_FOUND",
            "관리자 계정을 찾을 수 없습니다.",
          );
        }

        if (!admin.active) {
          throw new DomainError(
            "ADMIN_INACTIVE",
            "비활성 관리자 계정은 지원제도를 생성할 수 없습니다.",
          );
        }

        const program = await transaction.supportProgram.create({
          data: {
            slug: parsed.program.slug,
            category: parsed.program.category,
            managingOrganization: parsed.program.managingOrganization,
            operatingOrganization:
              parsed.program.operatingOrganization ?? null,
            createdById: parsed.createdById,
          },
          select: { id: true },
        });

        await createVersion(transaction, {
          program: { connect: { id: program.id } },
          versionNumber: 1,
          title: parsed.version.title,
          shortDescription: parsed.version.shortDescription,
          fullDescription: parsed.version.fullDescription,
          targetSummary: parsed.version.targetSummary,
          benefitType: parsed.version.benefitType,
          amountType: parsed.version.amountType,
          minimumAmount: toPrismaDecimal(parsed.version.minimumAmount),
          maximumAmount: toPrismaDecimal(parsed.version.maximumAmount),
          amountUnit: parsed.version.amountUnit ?? null,
          amountDescription: parsed.version.amountDescription ?? null,
          applicationType: parsed.version.applicationType,
          applicationStartDate: toDatabaseDate(
            parsed.version.applicationStartDate,
          ),
          applicationEndDate: toDatabaseDate(parsed.version.applicationEndDate),
          applicationMethod: parsed.version.applicationMethod,
          applicationUrl: parsed.version.applicationUrl ?? null,
          contactInformation: parsed.version.contactInformation,
          requiredDocuments: parsed.version.requiredDocuments,
          cautionText: parsed.version.cautionText ?? null,
          checkedAt: toDatabaseDate(parsed.version.checkedAt)!,
          publicationStatus: "DRAFT",
          createdBy: { connect: { id: parsed.createdById } },
        });

        return transaction.supportProgram.findUniqueOrThrow({
          where: { id: program.id },
          include: { versions: { orderBy: { versionNumber: "asc" } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return toCreatedProgramResult(program);
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
