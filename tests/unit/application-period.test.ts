import { describe, expect, it } from "vitest";
import { getApplicationPeriodStatus } from "@/features/benefits/application-period";

describe("신청 기간 공개 상태", () => {
  const fixed = { applicationType: "FIXED_PERIOD" as const, startDate: "2026-07-01", endDate: "2026-07-31" };
  it("기간 안은 OPEN", () => expect(getApplicationPeriodStatus({ ...fixed, evaluationDate: "2026-07-19" })).toBe("OPEN"));
  it("시작 전은 UPCOMING", () => expect(getApplicationPeriodStatus({ ...fixed, evaluationDate: "2026-06-30" })).toBe("UPCOMING"));
  it("종료 후는 CLOSED", () => expect(getApplicationPeriodStatus({ ...fixed, evaluationDate: "2026-08-01" })).toBe("CLOSED"));
  it("상시는 ALWAYS_OPEN", () => expect(getApplicationPeriodStatus({ applicationType: "ALWAYS_OPEN", startDate: null, endDate: null, evaluationDate: "2026-07-19" })).toBe("ALWAYS_OPEN"));
  it("예산 소진형은 확인 필요", () => expect(getApplicationPeriodStatus({ applicationType: "BUDGET_EXHAUSTION", startDate: null, endDate: null, evaluationDate: "2026-07-19" })).toBe("NEEDS_CONFIRMATION"));
  it("기간형 날짜 누락은 확인 필요", () => expect(getApplicationPeriodStatus({ applicationType: "FIXED_PERIOD", startDate: null, endDate: null, evaluationDate: "2026-07-19" })).toBe("NEEDS_CONFIRMATION"));
});
