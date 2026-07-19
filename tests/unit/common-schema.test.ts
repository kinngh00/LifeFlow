import { describe, expect, it } from "vitest";
import { eligibilityStatusSchema } from "@/schemas/common.schema";

describe("eligibilityStatusSchema", () => {
  it.each(["ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE", "UNDETERMINED"])(
    "%s 상태를 허용한다",
    (status) => {
      expect(eligibilityStatusSchema.parse(status)).toBe(status);
    },
  );

  it("정의되지 않은 상태를 거부한다", () => {
    expect(eligibilityStatusSchema.safeParse("MAYBE").success).toBe(false);
  });
});
