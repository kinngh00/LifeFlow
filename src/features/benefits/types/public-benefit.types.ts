import type {
  ApplicationType,
  EligibilityStatus,
  ProgramCategory,
  RuleOutcome,
  RuleType,
} from "@/generated/prisma/enums";
import type { ApplicationPeriodStatus } from "../application-period";

export type PublicApplication = {
  type: ApplicationType;
  startDate: string | null;
  endDate: string | null;
  status: ApplicationPeriodStatus;
  isOpen: boolean;
};

export type BenefitRecommendationItem = {
  programId: string;
  versionId: string;
  slug: string;
  title: string;
  category: ProgramCategory;
  organization: string;
  shortDescription: string;
  residenceRestriction: string;
  eligibilityStatus: EligibilityStatus;
  eligibilityLabel: string;
  matchedCount: number;
  failedCount: number;
  unknownCount: number;
  highlights: string[];
  application: PublicApplication;
  sourceCheckedAt: string;
  officialUrl: string;
  interestedCategoryMatch: boolean;
};

export type BenefitRecommendations = {
  items: BenefitRecommendationItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    eligible: number;
    needsReview: number;
    notEligible: number;
    undetermined: number;
  };
  evaluatedAt: string;
};

export type PublicRuleResult = {
  ruleType: RuleType;
  outcome: RuleOutcome;
  approvedMessage: string;
  userValueSummary: string | number | boolean | null;
  criteriaSummary: string;
  sourceLocation: string | null;
  reviewRequired: boolean;
};

export type PublishedBenefitDetail = {
  programId: string;
  versionId: string;
  slug: string;
  category: ProgramCategory;
  managingOrganization: string;
  operatingOrganization: string | null;
  versionNumber: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  targetSummary: string;
  benefitType: string;
  amount: {
    type: string;
    minimum: string | null;
    maximum: string | null;
    unit: string | null;
    description: string | null;
  };
  application: PublicApplication & {
    method: string;
    url: string | null;
  };
  contactInformation: string;
  requiredDocuments: string[];
  cautionText: string | null;
  checkedAt: string;
  residenceRestriction: string;
  sources: Array<{
    organizationName: string;
    documentTitle: string;
    sourceUrl: string;
    checkedAt: string;
    isPrimary: boolean;
    sourceLocation?: string | null;
  }>;
  eligibility: null | {
    status: EligibilityStatus;
    label: string;
    ruleResults: PublicRuleResult[];
  };
};
