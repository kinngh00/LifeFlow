import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "./domain-error";

const connectionErrorCodes = new Set(["P1000", "P1001", "P1002", "P1017"]);

function isSlugTarget(target: unknown): boolean {
  if (typeof target === "string") {
    return target.includes("slug");
  }

  return Array.isArray(target) && target.some((field) => field === "slug");
}

export function toDatabaseDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (
      error.code === "P2002" &&
      (isSlugTarget(error.meta?.target) ||
        error.meta?.modelName === "SupportProgram")
    ) {
      return new DomainError(
        "PROGRAM_SLUG_CONFLICT",
        "이미 사용 중인 지원제도 slug입니다.",
      );
    }

    if (connectionErrorCodes.has(error.code)) {
      return new DomainError(
        "DATABASE_UNAVAILABLE",
        "데이터베이스를 사용할 수 없습니다.",
      );
    }

    return new DomainError(
      "DATABASE_CONSTRAINT_ERROR",
      "데이터베이스 제약조건을 충족하지 못했습니다.",
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DomainError(
      "DATABASE_UNAVAILABLE",
      "데이터베이스를 사용할 수 없습니다.",
    );
  }

  return new DomainError(
    "INTERNAL_ERROR",
    "요청을 처리하는 중 예상하지 못한 오류가 발생했습니다.",
  );
}
