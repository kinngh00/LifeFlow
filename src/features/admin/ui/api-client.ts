"use client";

import type { ZodType } from "zod";

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminApi<T>(
  path: string,
  options: RequestInit = {},
  schema?: ZodType<T>,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...options.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: { code?: string; message?: string; details?: unknown } }).error
      : undefined;
    throw new AdminApiError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "요청을 처리하지 못했습니다.",
      error?.details,
    );
  }
  return schema ? schema.parse(payload) : (payload as T);
}

export function adminErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return "관리자 로그인이 필요합니다.";
    if (error.status === 429) return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    if (error.status === 503) return "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    return error.message;
  }
  return "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
}
