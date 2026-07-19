import { describe, expect, it } from "vitest";
import { hashAdminPassword, verifyAdminPassword } from "@/server/auth/password";

describe("admin password", () => {
  it("scrypt 해시를 생성하고 같은 비밀번호를 검증한다", async () => {
    const hash = await hashAdminPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifyAdminPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("잘못된 비밀번호는 실패한다", async () => {
    const hash = await hashAdminPassword("correct horse battery staple");
    expect(await verifyAdminPassword("incorrect password value", hash)).toBe(false);
  });

  it("같은 비밀번호도 salt가 달라 다른 해시가 된다", async () => {
    const first = await hashAdminPassword("correct horse battery staple");
    const second = await hashAdminPassword("correct horse battery staple");
    expect(first).not.toBe(second);
  });

  it("잘못된 저장 형식은 안전하게 실패한다", async () => {
    expect(await verifyAdminPassword("correct horse battery staple", "invalid-format")).toBe(false);
  });

  it("과도하게 긴 비밀번호를 거부한다", async () => {
    await expect(hashAdminPassword("x".repeat(129))).rejects.toBeInstanceOf(RangeError);
    expect(await verifyAdminPassword("x".repeat(129), "invalid")).toBe(false);
  });
});
