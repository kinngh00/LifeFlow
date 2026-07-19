import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { QuestionnaireProfileDraftSchema } from "@/features/questionnaire/schemas/questionnaire-profile.schema";

export const QUESTIONNAIRE_SESSION_SCHEMA_VERSION = 1;
export const QUESTIONNAIRE_SESSION_TTL_MS = 90 * 60 * 1_000;
export const QUESTIONNAIRE_SESSION_MAX_BYTES = 3_500;

const payloadSchema = z.object({
  schemaVersion: z.literal(QUESTIONNAIRE_SESSION_SCHEMA_VERSION),
  expiresAt: z.iso.datetime(),
  profile: QuestionnaireProfileDraftSchema,
});

export type QuestionnaireSessionPayload = z.infer<typeof payloadSchema>;

function keyFrom(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("USER_SESSION_ENCRYPTION_KEY는 base64 인코딩된 32바이트 키여야 합니다.");
  }
  return key;
}
export function encryptQuestionnaireSession(
  profile: QuestionnaireSessionPayload["profile"],
  encryptionKey: string,
  now = new Date(),
): string {
  const payload = payloadSchema.parse({
    schemaVersion: QUESTIONNAIRE_SESSION_SCHEMA_VERSION,
    expiresAt: new Date(now.getTime() + QUESTIONNAIRE_SESSION_TTL_MS).toISOString(),
    profile,
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(encryptionKey), iv);
  cipher.setAAD(Buffer.from("lifeflow-questionnaire-v1"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const encoded = [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
  if (Buffer.byteLength(encoded, "utf8") > QUESTIONNAIRE_SESSION_MAX_BYTES) {
    throw new Error("사용자 조건 세션이 쿠키 크기 제한을 초과했습니다.");
  }
  return encoded;
}

export function decryptQuestionnaireSession(
  encoded: string,
  encryptionKey: string,
  now = new Date(),
): QuestionnaireSessionPayload | null {
  try {
    const [version, ivValue, cipherValue, tagValue] = encoded.split(".");
    if (version !== "v1" || !ivValue || !cipherValue || !tagValue) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFrom(encryptionKey),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAAD(Buffer.from("lifeflow-questionnaire-v1"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = payloadSchema.parse(JSON.parse(plaintext));
    return new Date(payload.expiresAt).getTime() > now.getTime() ? payload : null;
  } catch {
    return null;
  }
}
