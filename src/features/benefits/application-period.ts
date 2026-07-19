import type { ApplicationType } from "@/generated/prisma/enums";

export type ApplicationPeriodStatus =
  | "OPEN"
  | "UPCOMING"
  | "CLOSED"
  | "ALWAYS_OPEN"
  | "NEEDS_CONFIRMATION";

export function getApplicationPeriodStatus(input: {
  applicationType: ApplicationType;
  startDate: string | null;
  endDate: string | null;
  evaluationDate: string;
}): ApplicationPeriodStatus {
  if (input.applicationType === "ALWAYS_OPEN") return "ALWAYS_OPEN";
  if (input.applicationType === "BUDGET_EXHAUSTION") return "NEEDS_CONFIRMATION";
  if (!input.startDate || !input.endDate) return "NEEDS_CONFIRMATION";
  if (input.evaluationDate < input.startDate) return "UPCOMING";
  if (input.evaluationDate > input.endDate) return "CLOSED";
  return "OPEN";
}
