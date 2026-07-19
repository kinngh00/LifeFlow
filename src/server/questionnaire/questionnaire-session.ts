import "server-only";

import { createHash } from "node:crypto";
import type { NextResponse } from "next/server";
import type { QuestionnaireProfileDraft } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import {
  decryptQuestionnaireSession,
  encryptQuestionnaireSession,
  QUESTIONNAIRE_SESSION_TTL_MS,
} from "./questionnaire-session-codec";

export const QUESTIONNAIRE_SESSION_COOKIE_NAME =
  "lifeflow_questionnaire_session";

export const questionnaireSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function encryptionKey(): string {
  const configured = process.env.USER_SESSION_ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("USER_SESSION_ENCRYPTION_KEY 환경 변수가 필요합니다.");
  }
  return createHash("sha256")
    .update("lifeflow-local-development-questionnaire-key")
    .digest("base64");
}
export function readCookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const pair of header.split(";")) {
    const [cookieName, ...parts] = pair.trim().split("=");
    if (cookieName === name) return decodeURIComponent(parts.join("="));
  }
  return undefined;
}

export function readQuestionnaireSession(
  request: Request,
): QuestionnaireProfileDraft | null {
  const encoded = readCookieValue(request, QUESTIONNAIRE_SESSION_COOKIE_NAME);
  if (!encoded) return null;
  return decryptQuestionnaireSession(encoded, encryptionKey())?.profile ?? null;
}

export function setQuestionnaireSession(
  response: NextResponse,
  profile: QuestionnaireProfileDraft,
): void {
  response.cookies.set(
    QUESTIONNAIRE_SESSION_COOKIE_NAME,
    encryptQuestionnaireSession(profile, encryptionKey()),
    {
      ...questionnaireSessionCookieOptions,
      maxAge: Math.floor(QUESTIONNAIRE_SESSION_TTL_MS / 1_000),
    },
  );
}

export function clearQuestionnaireSession(response: NextResponse): void {
  response.cookies.set(QUESTIONNAIRE_SESSION_COOKIE_NAME, "", {
    ...questionnaireSessionCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
}
