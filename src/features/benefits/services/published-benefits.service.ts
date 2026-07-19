import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { EligibilityStatus } from "@/generated/prisma/enums";
import { evaluateProgramEligibility } from "@/features/eligibility/engine/eligibility-engine";
import { EligibilityTestInputSchema } from "@/features/eligibility/schemas/eligibility-test-input.schema";
import type { ExecutableEligibilityRule } from "@/features/eligibility/types/eligibility-engine.types";
import { QuestionnaireProfileSchema, type QuestionnaireProfile } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import { AppError } from "@/server/errors/app-error";
import { getDatabaseClient } from "@/server/db/client";
import { getApplicationPeriodStatus } from "../application-period";
import { RecommendationFiltersSchema, type RecommendationFilters } from "../schemas/recommendation.schema";
import type {
  BenefitRecommendationItem,
  BenefitRecommendations,
  PublishedBenefitDetail,
} from "../types/public-benefit.types";

const publicProgramSelect = {
  id: true,
  slug: true,
  category: true,
  managingOrganization: true,
  operatingOrganization: true,
  archivedAt: true,
  currentPublishedVersion: {
    select: {
      id: true,
      versionNumber: true,
      title: true,
      shortDescription: true,
      fullDescription: true,
      targetSummary: true,
      benefitType: true,
      amountType: true,
      minimumAmount: true,
      maximumAmount: true,
      amountUnit: true,
      amountDescription: true,
      applicationType: true,
      applicationStartDate: true,
      applicationEndDate: true,
      applicationMethod: true,
      applicationUrl: true,
      contactInformation: true,
      requiredDocuments: true,
      cautionText: true,
      checkedAt: true,
      publicationStatus: true,
      sources: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          organizationName: true,
          documentTitle: true,
          sourceUrl: true,
          checkedAt: true,
          isPrimary: true,
        },
      },
      regions: {
        select: {
          cityCode: true,
          districtCode: true,
          coverageType: true,
          reviewRequired: true,
          requirementNote: true,
        },
      },
      eligibilityRules: {
        where: { active: true },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          ruleType: true,
          displayOrder: true,
          label: true,
          description: true,
          expectedCondition: true,
          required: true,
          reviewRequired: true,
          missingValueBehavior: true,
          passMessage: true,
          failureMessage: true,
          unknownMessage: true,
          sourceId: true,
          sourceLocation: true,
          active: true,
        },
      },
    },
  },
} as const satisfies Prisma.SupportProgramSelect;

type PublicProgramRecord = Prisma.SupportProgramGetPayload<{
  select: typeof publicProgramSelect;
}>;

const busanDistrictNames: Record<string, string> = {
  "26110": "중구", "26140": "서구", "26170": "동구", "26200": "영도구",
  "26230": "부산진구", "26260": "동래구", "26290": "남구", "26320": "북구",
  "26350": "해운대구", "26380": "사하구", "26410": "금정구", "26440": "강서구",
  "26470": "연제구", "26500": "수영구", "26530": "사상구", "26710": "기장군",
};

function residenceRestrictionFor(
  regions: NonNullable<PublicProgramRecord["currentPublishedVersion"]>["regions"],
): string {
  if (regions.some(({ coverageType }) => coverageType === "NATIONAL")) {
    return "부산 거주 필수 아님";
  }
  if (regions.some(({ coverageType }) => coverageType === "CITY_WIDE")) {
    return "부산광역시";
  }
  const districts = regions
    .filter(({ coverageType, districtCode }) => coverageType === "DISTRICT" && districtCode)
    .map(({ districtCode }) => busanDistrictNames[districtCode!] ?? districtCode!);
  return districts.length > 0
    ? `부산광역시 ${districts.join(", ")}`
    : "공식 안내 확인 필요";
}

const statusLabels: Record<EligibilityStatus, string> = {
  ELIGIBLE: "신청 가능성 높음",
  NEEDS_REVIEW: "추가 확인 필요",
  NOT_ELIGIBLE: "신청 가능성 낮음",
  UNDETERMINED: "판정 불가",
};

const statusOrder: Record<EligibilityStatus, number> = {
  ELIGIBLE: 0,
  NEEDS_REVIEW: 1,
  NOT_ELIGIBLE: 2,
  UNDETERMINED: 3,
};

function date(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

function profileToEngineInput(profile: QuestionnaireProfile, evaluationDate: string) {
  return EligibilityTestInputSchema.parse({
    birthDate: profile.birthDate ?? "UNKNOWN",
    residenceCityCode: profile.residenceCityCode ?? "UNKNOWN",
    residenceDistrictCode: profile.residenceDistrictCode ?? "UNKNOWN",
    employmentStatus:
      profile.jobSeekingStatus === "YES"
        ? "JOB_SEEKER"
        : profile.employmentStatus ?? "UNKNOWN",
    studentStatus: profile.studentStatus ?? "UNKNOWN",
    incomeBand: profile.incomeBand ?? "UNKNOWN",
    housingType: profile.housingType ?? "UNKNOWN",
    homeOwnershipStatus: profile.homeOwnershipStatus ?? "UNKNOWN",
    householdHeadStatus: profile.householdHeadStatus ?? "UNKNOWN",
    evaluationDate,
  });
}

function executableRules(version: NonNullable<PublicProgramRecord["currentPublishedVersion"]>): ExecutableEligibilityRule[] {
  return version.eligibilityRules.map((rule) => ({
    ...rule,
    expectedCondition: rule.expectedCondition,
  }));
}

function publicPrograms(database: PrismaClient, category?: string) {
  return database.supportProgram.findMany({
    where: {
      archivedAt: null,
      ...(category ? { category: category as "YOUTH_EMPLOYMENT" | "YOUTH_HOUSING" } : {}),
      currentPublishedVersion: {
        is: {
          publicationStatus: "PUBLISHED",
          sources: { some: { isPrimary: true } },
          eligibilityRules: { some: { active: true, required: true } },
        },
      },
    },
    select: publicProgramSelect,
  });
}

function applicationFor(
  version: NonNullable<PublicProgramRecord["currentPublishedVersion"]>,
  evaluationDate: string,
) {
  const startDate = date(version.applicationStartDate);
  const endDate = date(version.applicationEndDate);
  const status = getApplicationPeriodStatus({
    applicationType: version.applicationType,
    startDate,
    endDate,
    evaluationDate,
  });
  return {
    type: version.applicationType,
    startDate,
    endDate,
    status,
    isOpen: status === "OPEN" || status === "ALWAYS_OPEN",
  };
}

function toRecommendation(
  program: PublicProgramRecord,
  profile: QuestionnaireProfile,
  evaluationDate: string,
): BenefitRecommendationItem | null {
  const version = program.currentPublishedVersion;
  if (!version || version.publicationStatus !== "PUBLISHED") return null;
  const primarySource = version.sources.find(({ isPrimary }) => isPrimary);
  if (!primarySource) return null;
  const evaluation = evaluateProgramEligibility({
    rules: executableRules(version),
    input: profileToEngineInput(profile, evaluationDate),
    context: {
      applicationType: version.applicationType,
      applicationStartDate: date(version.applicationStartDate),
      applicationEndDate: date(version.applicationEndDate),
      checkedAt: date(version.checkedAt)!,
    },
  });
  const matchedCount = evaluation.ruleResults.filter(({ outcome }) => outcome === "PASS").length;
  const failedCount = evaluation.ruleResults.filter(({ outcome }) => outcome === "FAIL").length;
  const unknownCount = evaluation.ruleResults.filter(({ outcome }) => outcome === "UNKNOWN").length;
  return {
    programId: program.id,
    versionId: version.id,
    slug: program.slug,
    title: version.title,
    category: program.category,
    organization: program.operatingOrganization ?? program.managingOrganization,
    shortDescription: version.shortDescription,
    residenceRestriction: residenceRestrictionFor(version.regions),
    eligibilityStatus: evaluation.status,
    eligibilityLabel: statusLabels[evaluation.status],
    matchedCount,
    failedCount,
    unknownCount,
    highlights: evaluation.ruleResults.slice(0, 3).map(({ approvedMessage }) => approvedMessage),
    application: applicationFor(version, evaluationDate),
    sourceCheckedAt: date(primarySource.checkedAt)!,
    officialUrl: primarySource.sourceUrl,
    interestedCategoryMatch: profile.interestedCategories.includes(program.category),
  };
}

function sortRecommendations(items: BenefitRecommendationItem[]) {
  return items.sort((left, right) => {
    const byStatus = statusOrder[left.eligibilityStatus] - statusOrder[right.eligibilityStatus];
    if (byStatus) return byStatus;
    const byInterest = Number(right.interestedCategoryMatch) - Number(left.interestedCategoryMatch);
    if (byInterest) return byInterest;
    const leftDeadline = left.application.status === "OPEN" ? left.application.endDate : null;
    const rightDeadline = right.application.status === "OPEN" ? right.application.endDate : null;
    if (leftDeadline && rightDeadline && leftDeadline !== rightDeadline) return leftDeadline.localeCompare(rightDeadline);
    if (leftDeadline !== rightDeadline) return leftDeadline ? -1 : 1;
    const byCheckedAt = right.sourceCheckedAt.localeCompare(left.sourceCheckedAt);
    return byCheckedAt || left.title.localeCompare(right.title, "ko");
  });
}

export async function getPersonalizedBenefitRecommendations(input: {
  profile: QuestionnaireProfile;
  filters?: RecommendationFilters;
  evaluationDate: string;
  database?: PrismaClient;
}): Promise<BenefitRecommendations> {
  const profile = QuestionnaireProfileSchema.parse(input.profile);
  const filters = RecommendationFiltersSchema.parse(input.filters ?? {});
  const records = await publicPrograms(input.database ?? getDatabaseClient(), filters.category);
  const all = sortRecommendations(
    records
      .map((program) => toRecommendation(program, profile, input.evaluationDate))
      .filter((item): item is BenefitRecommendationItem => Boolean(item)),
  );
  const summaryItems = all;
  const filtered = filters.status
    ? all.filter(({ eligibilityStatus }) => eligibilityStatus === filters.status)
    : all;
  const start = (filters.page - 1) * filters.pageSize;
  return {
    items: filtered.slice(start, start + filters.pageSize),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / filters.pageSize),
    },
    summary: {
      eligible: summaryItems.filter(({ eligibilityStatus }) => eligibilityStatus === "ELIGIBLE").length,
      needsReview: summaryItems.filter(({ eligibilityStatus }) => eligibilityStatus === "NEEDS_REVIEW").length,
      notEligible: summaryItems.filter(({ eligibilityStatus }) => eligibilityStatus === "NOT_ELIGIBLE").length,
      undetermined: summaryItems.filter(({ eligibilityStatus }) => eligibilityStatus === "UNDETERMINED").length,
    },
    evaluatedAt: input.evaluationDate,
  };
}

export async function getPublishedBenefitDetail(input: {
  slug: string;
  profile?: QuestionnaireProfile | null;
  evaluationDate: string;
  database?: PrismaClient;
}): Promise<PublishedBenefitDetail> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new AppError("BENEFIT_NOT_FOUND", "공개 지원제도를 찾을 수 없습니다.", 404);
  }
  const program = await (input.database ?? getDatabaseClient()).supportProgram.findFirst({
    where: {
      slug: input.slug,
      archivedAt: null,
      currentPublishedVersion: {
        is: { publicationStatus: "PUBLISHED", sources: { some: { isPrimary: true } } },
      },
    },
    select: publicProgramSelect,
  });
  const version = program?.currentPublishedVersion;
  if (!program || !version || version.publicationStatus !== "PUBLISHED") {
    throw new AppError("BENEFIT_NOT_FOUND", "공개 지원제도를 찾을 수 없습니다.", 404);
  }
  const profile = input.profile ? QuestionnaireProfileSchema.parse(input.profile) : null;
  const evaluation = profile
    ? evaluateProgramEligibility({
        rules: executableRules(version),
        input: profileToEngineInput(profile, input.evaluationDate),
        context: {
          applicationType: version.applicationType,
          applicationStartDate: date(version.applicationStartDate),
          applicationEndDate: date(version.applicationEndDate),
          checkedAt: date(version.checkedAt)!,
        },
      })
    : null;
  return {
    programId: program.id,
    versionId: version.id,
    slug: program.slug,
    category: program.category,
    managingOrganization: program.managingOrganization,
    operatingOrganization: program.operatingOrganization,
    versionNumber: version.versionNumber,
    title: version.title,
    shortDescription: version.shortDescription,
    fullDescription: version.fullDescription,
    targetSummary: version.targetSummary,
    benefitType: version.benefitType,
    amount: {
      type: version.amountType,
      minimum: version.minimumAmount?.toString() ?? null,
      maximum: version.maximumAmount?.toString() ?? null,
      unit: version.amountUnit,
      description: version.amountDescription,
    },
    application: {
      ...applicationFor(version, input.evaluationDate),
      method: version.applicationMethod,
      url: version.applicationUrl,
    },
    contactInformation: version.contactInformation,
    requiredDocuments: Array.isArray(version.requiredDocuments)
      ? version.requiredDocuments.filter((item): item is string => typeof item === "string")
      : [],
    cautionText: version.cautionText,
    checkedAt: date(version.checkedAt)!,
    residenceRestriction: residenceRestrictionFor(version.regions),
    sources: version.sources.map((source) => ({
      organizationName: source.organizationName,
      documentTitle: source.documentTitle,
      sourceUrl: source.sourceUrl,
      checkedAt: date(source.checkedAt)!,
      isPrimary: source.isPrimary,
    })),
    eligibility: evaluation
      ? {
          status: evaluation.status,
          label: statusLabels[evaluation.status],
          ruleResults: evaluation.ruleResults.map((result) => {
            const rule = version.eligibilityRules.find(({ id }) => id === result.ruleId)!;
            return {
              ruleType: result.ruleType,
              outcome: result.outcome,
              approvedMessage: result.approvedMessage,
              userValueSummary: result.userValue,
              criteriaSummary: rule.description,
              sourceLocation: result.sourceLocation,
              reviewRequired: result.reviewRequired,
            };
          }),
        }
      : null,
  };
}

export { statusLabels as eligibilityStatusLabels };
