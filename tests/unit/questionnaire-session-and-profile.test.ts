import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { QuestionnaireProfileDraftSchema } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import {
  decryptQuestionnaireSession,
  encryptQuestionnaireSession,
} from "@/server/questionnaire/questionnaire-session-codec";

const key = randomBytes(32).toString("base64");
const profile = {
  birthDate: "2000-01-01",
  residenceCityCode: "26000",
  interestedCategories: ["YOUTH_EMPLOYMENT" as const],
};

describe("비회원 조건 세션", () => {
  it("프로필을 암호화하고 복호화한다", () => {
    const encoded = encryptQuestionnaireSession(profile, key, new Date("2026-07-19T00:00:00Z"));
    expect(decryptQuestionnaireSession(encoded, key, new Date("2026-07-19T00:01:00Z"))?.profile).toEqual(profile);
  });
  it("암호문에 생년월일 원문이 없다", () => expect(encryptQuestionnaireSession(profile, key)).not.toContain("2000-01-01"));
  it("변조된 쿠키를 거부한다", () => {
    const encoded = encryptQuestionnaireSession(profile, key);
    const parts = encoded.split(".");
    parts[2] = `${parts[2]![0] === "A" ? "B" : "A"}${parts[2]!.slice(1)}`;
    expect(decryptQuestionnaireSession(parts.join("."), key)).toBeNull();
  });
  it("만료된 쿠키를 거부한다", () => {
    const encoded = encryptQuestionnaireSession(profile, key, new Date("2026-07-19T00:00:00Z"));
    expect(decryptQuestionnaireSession(encoded, key, new Date("2026-07-20T00:00:00Z"))).toBeNull();
  });
  it("잘못된 키 길이를 거부한다", () => expect(() => encryptQuestionnaireSession(profile, "bad-key")).toThrow("32바이트"));
  it("스키마 밖의 큰 데이터를 저장하지 않는다", () => expect(() => encryptQuestionnaireSession({ ...profile, extra: "x".repeat(5000) } as never, key)).toThrow());
});

describe("사용자 입력 스키마", () => {
  it("미래 생년월일을 거부한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ birthDate: "2999-01-01" }).success).toBe(false));
  it("1900년 이전 생년월일을 거부한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ birthDate: "1899-12-31" }).success).toBe(false));
  it("가구원 수 0명을 거부한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ householdSize: 0 }).success).toBe(false));
  it("가구원 수 상한을 검증한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ householdSize: 21 }).success).toBe(false));
  it("부산 외 지역의 구·군 입력을 거부한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ residenceCityCode: "11000", residenceDistrictCode: "26110" }).success).toBe(false));
  it("모름 값을 허용한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ birthDate: "UNKNOWN", householdSize: "UNKNOWN" }).success).toBe(true));
  it("관심 분야 빈 배열을 거부한다", () => expect(QuestionnaireProfileDraftSchema.safeParse({ interestedCategories: [] }).success).toBe(false));
});
