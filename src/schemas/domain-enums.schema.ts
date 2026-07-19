import { z } from "zod";

export const programCategorySchema = z.enum([
  "YOUTH_EMPLOYMENT",
  "YOUTH_HOUSING",
]);

export const publicationStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
]);

export const sourceTypeSchema = z.enum([
  "OFFICIAL_PAGE",
  "PUBLIC_NOTICE",
  "ATTACHMENT",
]);

export const regionCoverageTypeSchema = z.enum([
  "NATIONAL",
  "CITY_WIDE",
  "DISTRICT",
]);

export const ruleTypeSchema = z.enum([
  "AGE",
  "REGION",
  "EMPLOYMENT",
  "STUDENT",
  "INCOME_BAND",
  "HOUSING",
  "APPLICATION_PERIOD",
  "MANUAL_REVIEW",
]);

export const ruleOutcomeSchema = z.enum(["PASS", "FAIL", "UNKNOWN"]);

export const eligibilityStatusSchema = z.enum([
  "ELIGIBLE",
  "NEEDS_REVIEW",
  "NOT_ELIGIBLE",
  "UNDETERMINED",
]);

export const applicationTypeSchema = z.enum([
  "FIXED_PERIOD",
  "ALWAYS_OPEN",
  "BUDGET_EXHAUSTION",
]);

export const amountTypeSchema = z.enum([
  "FIXED",
  "RANGE",
  "MAXIMUM",
  "FORMULA",
  "IN_KIND",
  "UNDETERMINED",
]);

export const publicationEventTypeSchema = z.enum([
  "PUBLISHED",
  "UNPUBLISHED",
  "VERSION_REPLACED",
  "ARCHIVED",
]);

export const adminAuditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "TEST_RUN",
  "PUBLISH",
  "UNPUBLISH",
  "ARCHIVE",
]);
