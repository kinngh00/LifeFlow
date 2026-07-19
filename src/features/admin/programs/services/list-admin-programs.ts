import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/server/db/client";
import { toDatabaseDomainError } from "@/server/errors/prisma-error";
import { parseOrThrow } from "@/server/errors/validation-error";
import {
  AdminProgramListQuerySchema,
  type AdminProgramListQuery,
} from "../schemas/admin-program-list.schema";
import {
  adminProgramSelect,
  toAdminProgramListItem,
} from "../mappers/admin-program.mapper";
import type { AdminProgramListResult } from "../types/admin-program.types";

export async function listAdminPrograms(
  input: AdminProgramListQuery,
  database: PrismaClient = getDatabaseClient(),
): Promise<AdminProgramListResult> {
  const query = parseOrThrow(AdminProgramListQuerySchema, input);
  const where: Prisma.SupportProgramWhereInput = {
    ...(query.includeArchived ? {} : { archivedAt: null }),
    ...(query.category ? { category: query.category } : {}),
    ...(query.publicationStatus
      ? {
          versions: {
            some: { publicationStatus: query.publicationStatus },
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { slug: { contains: query.search, mode: "insensitive" } },
            {
              managingOrganization: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              operatingOrganization: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              versions: {
                some: {
                  title: { contains: query.search, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };

  try {
    const [programs, total] = await database.$transaction([
      database.supportProgram.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: adminProgramSelect,
      }),
      database.supportProgram.count({ where }),
    ]);

    return {
      items: programs.map(toAdminProgramListItem),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  } catch (error) {
    throw toDatabaseDomainError(error);
  }
}
