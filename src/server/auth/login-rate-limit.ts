import "server-only";

import { createHash } from "node:crypto";
import { DomainError } from "@/server/errors/domain-error";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = new Map<string, { count: number; windowStartedAt: number }>();

function keyFor(email: string, request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${email.trim().toLowerCase()}|${ip}`).digest("hex");
}

export function assertLoginAttemptAllowed(email: string, request: Request, now = Date.now()): void {
  const key = keyFor(email, request);
  const current = attempts.get(key);
  if (!current || now - current.windowStartedAt >= WINDOW_MS) return;
  if (current.count >= MAX_FAILURES) {
    throw new DomainError("LOGIN_RATE_LIMITED", "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export function recordLoginFailure(email: string, request: Request, now = Date.now()): void {
  const key = keyFor(email, request);
  const current = attempts.get(key);
  if (!current || now - current.windowStartedAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, windowStartedAt: now });
  } else {
    current.count += 1;
  }
}

export function clearLoginFailures(email: string, request: Request): void {
  attempts.delete(keyFor(email, request));
}

export function resetLoginRateLimitForTests(): void {
  attempts.clear();
}
