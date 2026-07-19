import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { DomainError } from "@/server/errors/domain-error";

export const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

export function isSerializableTransactionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function runSerializableTransaction<T>(
  database: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializableTransactionConflict(error)) throw error;
      if (attempt === maxAttempts) {
        throw new DomainError(
          "TRANSACTION_CONFLICT",
          "동시 요청과 충돌했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    }
  }

  throw new DomainError("TRANSACTION_CONFLICT", "트랜잭션을 완료하지 못했습니다.");
}
