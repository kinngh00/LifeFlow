import { z } from "zod";
import {
  amountTypeSchema,
  applicationTypeSchema,
  publicationStatusSchema,
} from "./domain-enums.schema";

const dateOnlySchema = z.iso.date();
const decimalAmountSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(
    /^\d+(?:\.\d{1,2})?$/,
    "금액은 소수점 둘째 자리까지의 문자열이어야 합니다.",
  );

function toMinorUnits(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export const ProgramVersionContentSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    shortDescription: z.string().trim().min(1).max(500),
    fullDescription: z.string().trim().min(1),
    targetSummary: z.string().trim().min(1),
    benefitType: z.string().trim().min(1).max(100),
    amountType: amountTypeSchema,
    minimumAmount: decimalAmountSchema.nullable().optional(),
    maximumAmount: decimalAmountSchema.nullable().optional(),
    amountUnit: z.string().trim().min(1).max(50).nullable().optional(),
    amountDescription: z.string().trim().min(1).nullable().optional(),
    applicationType: applicationTypeSchema,
    applicationStartDate: dateOnlySchema.nullable().optional(),
    applicationEndDate: dateOnlySchema.nullable().optional(),
    applicationMethod: z.string().trim().min(1),
    applicationUrl: z.string().url().nullable().optional(),
    contactInformation: z.string().trim().min(1),
    requiredDocuments: z
      .array(z.string().trim().min(1).max(200))
      .max(30)
      .default([]),
    cautionText: z.string().trim().min(1).nullable().optional(),
    checkedAt: dateOnlySchema,
  })
  .strict()
  .superRefine((value, context) => {
    const startDate = value.applicationStartDate;
    const endDate = value.applicationEndDate;
    const minimumAmount = value.minimumAmount;
    const maximumAmount = value.maximumAmount;

    if (value.applicationType === "FIXED_PERIOD") {
      if (!startDate) {
        context.addIssue({
          code: "custom",
          path: ["applicationStartDate"],
          message: "기간형 신청에는 시작일이 필요합니다.",
        });
      }
      if (!endDate) {
        context.addIssue({
          code: "custom",
          path: ["applicationEndDate"],
          message: "기간형 신청에는 종료일이 필요합니다.",
        });
      }
      if (startDate && endDate && startDate > endDate) {
        context.addIssue({
          code: "custom",
          path: ["applicationEndDate"],
          message: "신청 종료일은 시작일보다 빠를 수 없습니다.",
        });
      }
    }

    if (value.applicationType === "ALWAYS_OPEN" && (startDate || endDate)) {
      context.addIssue({
        code: "custom",
        path: ["applicationType"],
        message: "상시 신청에는 시작일과 종료일을 입력하지 않습니다.",
      });
    }

    if (value.applicationType === "BUDGET_EXHAUSTION" && endDate) {
      context.addIssue({
        code: "custom",
        path: ["applicationEndDate"],
        message: "예산 소진형 신청에는 확정 종료일을 입력하지 않습니다.",
      });
    }

    if (value.amountType === "FIXED") {
      if (!minimumAmount) {
        context.addIssue({
          code: "custom",
          path: ["minimumAmount"],
          message: "정액 지원에는 금액이 필요합니다.",
        });
      }
      if (maximumAmount) {
        context.addIssue({
          code: "custom",
          path: ["maximumAmount"],
          message: "정액 지원에는 최대 금액을 별도로 입력하지 않습니다.",
        });
      }
    }

    if (value.amountType === "RANGE" && (!minimumAmount || !maximumAmount)) {
      context.addIssue({
        code: "custom",
        path: ["amountType"],
        message: "범위형 지원에는 최소 금액과 최대 금액이 필요합니다.",
      });
    }

    if (value.amountType === "MAXIMUM") {
      if (!maximumAmount) {
        context.addIssue({
          code: "custom",
          path: ["maximumAmount"],
          message: "최대액 지원에는 최대 금액이 필요합니다.",
        });
      }
      if (minimumAmount) {
        context.addIssue({
          code: "custom",
          path: ["minimumAmount"],
          message: "최대액 지원에는 최소 금액을 입력하지 않습니다.",
        });
      }
    }

    if (
      ["FORMULA", "IN_KIND", "UNDETERMINED"].includes(value.amountType) &&
      (minimumAmount || maximumAmount)
    ) {
      context.addIssue({
        code: "custom",
        path: ["amountType"],
        message: "선택한 금액 유형에는 최소·최대 금액을 입력하지 않습니다.",
      });
    }

    if (
      minimumAmount &&
      maximumAmount &&
      toMinorUnits(minimumAmount) > toMinorUnits(maximumAmount)
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumAmount"],
        message: "최소 금액은 최대 금액보다 클 수 없습니다.",
      });
    }
  });

export const ProgramVersionCreateSchema = ProgramVersionContentSchema.safeExtend({
  programId: z.string().min(1),
  versionNumber: z.number().int().positive(),
  reviewedAt: dateOnlySchema.nullable().optional(),
  reviewDueAt: dateOnlySchema.nullable().optional(),
  publicationStatus: publicationStatusSchema.default("DRAFT"),
  supersedesVersionId: z.string().min(1).nullable().optional(),
  createdById: z.string().min(1),
});

export type ProgramVersionContentInput = z.infer<
  typeof ProgramVersionContentSchema
>;
export type ProgramVersionCreateInput = z.infer<
  typeof ProgramVersionCreateSchema
>;
