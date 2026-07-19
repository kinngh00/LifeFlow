import type { CreateProgramWithInitialVersionInput } from "@/features/admin/programs/schemas/create-program.schema";
import type { UpdateDraftProgramConfigurationInput } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";

type Configuration = Omit<UpdateDraftProgramConfigurationInput, "programVersionId" | "updatedById">;

export type VerifiedProgramDefinition = {
  create: Omit<CreateProgramWithInitialVersionInput, "createdById">;
  configuration: Configuration;
  publicationReason: string;
};

const checkedAt = "2026-07-19";
const sourceReference = { sourceIndex: 0 } as const;

function rule(
  displayOrder: number,
  ruleType: "AGE" | "REGION" | "EMPLOYMENT" | "STUDENT" | "HOUSING" | "MANUAL_REVIEW",
  label: string,
  sourceLocation: string,
  expectedCondition: Record<string, unknown>,
  reviewRequired = ruleType === "MANUAL_REVIEW",
) {
  return {
    displayOrder,
    ruleType,
    label,
    description: `${label} 조건을 공식 출처 기준으로 확인합니다.`,
    expectedCondition,
    required: true,
    reviewRequired,
    missingValueBehavior: "UNKNOWN" as const,
    passMessage: `${label} 조건을 충족합니다.`,
    failureMessage: `${label} 조건을 충족하지 않습니다.`,
    unknownMessage: `${label} 조건은 추가 확인이 필요합니다.`,
    sourceReference,
    sourceLocation,
    active: true,
  };
}

function outcomes(values: Array<"PASS" | "FAIL" | "UNKNOWN">) {
  return values.map((outcome, index) => ({ displayOrder: index + 1, outcome }));
}

const didimdolRules = [
  rule(1, "AGE", "연령", "신청자격 > 나이", { minimumAge: 18, maximumAge: 39, referenceDate: "NOTICE_DATE" }),
  rule(2, "REGION", "부산 거주", "신청자격 > 거주", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "STUDENT", "최종학력", "신청자격 > 학력", { allowedStatuses: ["GRADUATED", "NOT_A_STUDENT"] }),
  rule(4, "MANUAL_REVIEW", "취업·소득·중복참여 증빙", "신청자격 및 제외대상", {
    reviewPrompt: "주 30시간 미만 근로 예외, 건강보험료, 과거 참여 및 중복수혜 제한을 증빙으로 확인하세요.",
    evidenceDescription: "근로계약서, 건강보험료 자료, 참여 이력",
  }),
] as Configuration["rules"];

const workingCardRules = [
  rule(1, "AGE", "연령", "지원대상 > 나이", { minimumAge: 18, maximumAge: 39, referenceDate: "NOTICE_DATE" }),
  rule(2, "REGION", "부산 거주", "지원대상 > 거주", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "EMPLOYMENT", "재직 상태", "지원대상 > 재직", { allowedStatuses: ["EMPLOYED"] }),
  rule(4, "MANUAL_REVIEW", "사업장·재직기간·소득 증빙", "지원대상 및 제외대상", {
    reviewPrompt: "부산 소재 중소기업, 3개월 이상 재직, 입사일, 월소득·건강보험료 및 제외대상을 확인하세요.",
    evidenceDescription: "재직증명서, 사업장 정보, 급여 및 건강보험료 자료",
  }),
] as Configuration["rules"];

const trainingCardRules = [
  rule(1, "AGE", "연령 상한", "지원 제외 대상 > 만 75세 이상", { maximumAge: 74, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "지원 대상", { coverage: "NATIONAL" }),
  rule(3, "MANUAL_REVIEW", "발급 제외대상 확인", "지원 제외 대상", {
    reviewPrompt: "공무원·사립학교 교직원, 소득 기준, 재학생 잔여 수업연한, 타 훈련지원 등 제외대상을 확인하세요.",
    evidenceDescription: "신분·소득·재학·타 지원 이력",
  }),
] as Configuration["rules"];

const monthlyRentRules = [
  rule(1, "AGE", "청년 연령", "지원대상 > 연령", { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "지원대상", { coverage: "NATIONAL" }),
  rule(3, "HOUSING", "무주택 월세 거주", "지원대상 > 주거", { allowedHousingTypes: ["MONTHLY_RENT"], requiresNoHomeOwnership: true }),
  rule(4, "MANUAL_REVIEW", "소득·재산·임대차 심사", "선정기준 및 제외대상", {
    reviewPrompt: "청년가구·원가구 소득과 재산, 임대차계약, 중복수혜 및 제외대상을 확인하세요.",
    evidenceDescription: "소득·재산 자료, 임대차계약서, 가족관계 및 수혜 이력",
  }),
] as Configuration["rules"];

const dormitoryRules = [
  rule(1, "REGION", "전국 거주자 신청 가능", "지원대상", { coverage: "NATIONAL" }),
  rule(2, "STUDENT", "대학 재학생", "지원대상 > 부산지역 대학 재학생", { allowedStatuses: ["ENROLLED"] }),
  rule(3, "HOUSING", "기숙사 거주", "지원내용 > 부산행복연합기숙사", { allowedHousingTypes: ["DORMITORY"] }),
  rule(4, "MANUAL_REVIEW", "대학·통학·선발 요건", "지원대상 및 선발", {
    reviewPrompt: "부산 소재 대학 재학, 부산행복연합기숙사 입사, 원거리 통학 및 학교 추천·선발 여부를 확인하세요.",
    evidenceDescription: "재학증명, 기숙사 입사 및 학교 추천 자료",
  }),
] as Configuration["rules"];

export const firstVerifiedPrograms: VerifiedProgramDefinition[] = [
  {
    create: {
      program: { slug: "busan-youth-didimdol-card-plus", category: "YOUTH_EMPLOYMENT", managingOrganization: "부산광역시", operatingOrganization: "부산경제진흥원" },
      version: {
        title: "2026년 부산 청년 디딤돌카드+ 모집",
        shortDescription: "부산 미취업 청년의 구직활동비를 월 30만 원씩 최대 6개월 지원합니다.",
        fullDescription: "부산 거주 미취업 청년의 구직활동을 지원하는 2026년 모집 공고입니다.",
        targetSummary: "공고일 기준 부산 거주 18~39세 미취업 청년 중 학력·소득 등 요건 충족자",
        benefitType: "구직활동비", amountType: "MAXIMUM", maximumAmount: "1800000", amountUnit: "원", amountDescription: "월 30만 원씩 최대 6개월",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-03-09", applicationEndDate: "2026-03-27",
        applicationMethod: "부산청년플랫폼 온라인 신청", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=31",
        contactInformation: "부산경제진흥원 051-600-1874, 051-600-1875",
        requiredDocuments: ["최종학력 증명서", "고용보험 피보험자격 이력내역서", "가족관계증명서"],
        cautionText: "현재 접수 종료. 근로시간 예외, 건강보험료, 과거 참여 및 중복수혜 여부는 별도 확인이 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "2026 부산 청년 디딤돌카드+", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=31", documentIdentifier: "BUSAN-YOUTH-MENU-31-2026", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL", reviewRequired: false }],
      rules: didimdolRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1996-01-01", residenceCityCode: "26000", studentStatus: "GRADUATED", evaluationDate: "2026-03-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "최소연령 미달", inputSnapshot: { birthDate: "2009-01-01", residenceCityCode: "26000", studentStatus: "GRADUATED", evaluationDate: "2026-03-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 거주", inputSnapshot: { birthDate: "1996-01-01", residenceCityCode: "11000", studentStatus: "GRADUATED", evaluationDate: "2026-03-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "재학생", inputSnapshot: { birthDate: "1996-01-01", residenceCityCode: "26000", studentStatus: "ENROLLED", evaluationDate: "2026-03-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
        { name: "거주지 미입력", inputSnapshot: { birthDate: "1996-01-01", residenceCityCode: "UNKNOWN", studentStatus: "GRADUATED", evaluationDate: "2026-03-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN","PASS","UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "2026년 공식 모집정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "busan-youth-working-joy-card", category: "YOUTH_EMPLOYMENT", managingOrganization: "부산광역시", operatingOrganization: "부산경제진흥원" },
      version: {
        title: "2026년 부산 청년 일하는 기쁨카드 모집", shortDescription: "부산 중소기업 재직 청년에게 100만 원 상당의 복지포인트를 지원합니다.",
        fullDescription: "부산 소재 중소기업에 재직하는 청년의 복지 향상을 위한 2026년 모집입니다.", targetSummary: "부산 거주 18~39세이며 부산 소재 중소기업에 3개월 이상 재직한 청년",
        benefitType: "복지포인트", amountType: "FIXED", minimumAmount: "1000000", amountUnit: "원", amountDescription: "연 100만 원 상당 복지포인트",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-04-06", applicationEndDate: "2026-04-24", applicationMethod: "부산청년플랫폼 온라인 신청", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=33",
        contactInformation: "부산경제진흥원 051-600-1872, 051-600-1873", requiredDocuments: ["재직증명서", "건강보험료 납부확인 자료"], cautionText: "현재 접수 종료. 사업장·입사일·재직기간·소득 및 보험료는 증빙 확인이 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "2026 부산 청년 일하는 기쁨카드", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=33", documentIdentifier: "BUSAN-YOUTH-MENU-33-2026", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL", reviewRequired: false }], rules: workingCardRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "EMPLOYED", evaluationDate: "2026-04-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", employmentStatus: "EMPLOYED", evaluationDate: "2026-04-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", employmentStatus: "EMPLOYED", evaluationDate: "2026-04-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "미취업 상태", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "UNEMPLOYED", evaluationDate: "2026-04-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
        { name: "재직 상태 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "UNKNOWN", evaluationDate: "2026-04-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN","UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "2026년 공식 모집정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "national-learning-card", category: "YOUTH_EMPLOYMENT", managingOrganization: "고용노동부", operatingOrganization: "고용24" },
      version: {
        title: "국민내일배움카드", shortDescription: "직업훈련비를 5년간 기본 300만 원, 조건에 따라 최대 500만 원까지 지원합니다.", fullDescription: "국민의 직업능력 개발을 지원하는 전국 단위 제도입니다.", targetSummary: "만 75세 미만 국민 중 공식 제외대상에 해당하지 않는 사람",
        benefitType: "직업훈련비", amountType: "RANGE", minimumAmount: "3000000", maximumAmount: "5000000", amountUnit: "원", amountDescription: "5년간 기본 300만 원, 조건별 최대 200만 원 추가",
        applicationType: "ALWAYS_OPEN", applicationMethod: "고용24 온라인 또는 고용센터 신청", applicationUrl: "https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?systClId=SC00000004&systCnntId=CI00001783&systId=SI00000351", contactInformation: "고용노동부 고객상담센터 1350", requiredDocuments: [], cautionText: "훈련과정별 자부담과 발급 제외대상은 공식 페이지에서 추가 확인해야 합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "고용노동부", documentTitle: "국민내일배움카드 제도 안내", sourceUrl: "https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?systClId=SC00000004&systCnntId=CI00001783&systId=SI00000351", documentIdentifier: "WORK24-SI00000351", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false }], rules: trainingCardRules,
      testCases: [
        { name: "전국 자동조건 충족", inputSnapshot: { birthDate: "1990-01-01", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "75세 이상", inputSnapshot: { birthDate: "1950-01-01", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 거주도 지역 통과", inputSnapshot: { birthDate: "1990-01-01", residenceCityCode: "11000", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "지역 미입력도 전국 통과", inputSnapshot: { birthDate: "1990-01-01", residenceCityCode: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "연령 미입력", inputSnapshot: { birthDate: "UNKNOWN", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["UNKNOWN","PASS","UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "고용24 공식 제도정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "national-youth-monthly-rent-support-2026", category: "YOUTH_HOUSING", managingOrganization: "국토교통부", operatingOrganization: "복지로" },
      version: {
        title: "2026년 청년월세 지원사업 신규 수혜자 모집", shortDescription: "무주택 청년에게 실제 납부 임대료를 월 최대 20만 원씩 최대 24개월 지원합니다.", fullDescription: "국토교통부의 전국 단위 청년월세 지원사업 2026년 신규 모집입니다.", targetSummary: "19~34세 무주택 월세 거주 청년 중 소득·재산 등 요건 충족자",
        benefitType: "월세 지원", amountType: "MAXIMUM", maximumAmount: "4800000", amountUnit: "원", amountDescription: "월 최대 20만 원, 최대 24개월",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-03-30", applicationEndDate: "2026-05-29", applicationMethod: "복지로 온라인 또는 주소지 관할 행정복지센터 신청", applicationUrl: "https://m.bokjiro.go.kr/ssis-tem/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004661", contactInformation: "국토교통부 청년주거정책과 및 관할 행정복지센터", requiredDocuments: ["임대차계약서", "월세 이체 증빙", "가족관계증명서"], cautionText: "현재 접수 종료. 소득·재산·가구 구성·임대차 및 중복수혜 심사는 별도 확인이 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "보건복지부 복지로", documentTitle: "청년월세 지원사업", sourceUrl: "https://m.bokjiro.go.kr/ssis-tem/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004661", documentIdentifier: "BOKJIRO-WLF00004661", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false }], rules: monthlyRentRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-04-01" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "연령 초과", inputSnapshot: { birthDate: "1985-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-04-01" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "주택 소유", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "OWNS_HOME", evaluationDate: "2026-04-01" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
        { name: "전세 거주", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-04-01" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
        { name: "지역 미입력도 전국 통과", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "UNKNOWN", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-04-01" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "복지로 공식 모집정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "busan-university-dormitory-fee-2026", category: "YOUTH_HOUSING", managingOrganization: "부산광역시", operatingOrganization: "부산행복연합기숙사" },
      version: {
        title: "2026년 부산지역 대학생 기숙사비 지원 일반 재학생 모집", shortDescription: "부산행복연합기숙사 입사 대학생에게 월 5만 원, 연 60만 원을 지원합니다.", fullDescription: "부산 소재 대학 재학생 중 원거리 통학자를 대상으로 하는 일반 재학생 모집 회차입니다.", targetSummary: "부산 소재 대학 재학생 중 부산행복연합기숙사 입사 및 원거리 통학 등 선발요건 충족자",
        benefitType: "기숙사비", amountType: "FIXED", minimumAmount: "600000", amountUnit: "원/년", amountDescription: "월 5만 원, 연 60만 원",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-01-07", applicationEndDate: "2026-01-14", applicationMethod: "부산행복연합기숙사 모집 절차에 따라 신청", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=47", contactInformation: "부산광역시 지산학협력과 051-888-6785, 부산행복연합기숙사 051-711-0314", requiredDocuments: ["재학증명서", "기숙사 입사 관련 서류"], cautionText: "현재 접수 종료. 정시 신입생 모집은 별도 회차이며 이 버전에 포함하지 않습니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "부산지역 대학생 기숙사비 지원", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=47", documentIdentifier: "BUSAN-YOUTH-MENU-47-2026-REGULAR", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: true, requirementNote: "신청자 거주지는 제한하지 않지만 부산 소재 대학 재학·기숙사 입사·원거리 통학 여부는 별도 확인" }], rules: dormitoryRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { residenceCityCode: "26000", studentStatus: "ENROLLED", housingType: "DORMITORY", evaluationDate: "2026-01-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "학생 아님", inputSnapshot: { residenceCityCode: "26000", studentStatus: "NOT_A_STUDENT", housingType: "DORMITORY", evaluationDate: "2026-01-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "기숙사 외 거주", inputSnapshot: { residenceCityCode: "26000", studentStatus: "ENROLLED", housingType: "MONTHLY_RENT", evaluationDate: "2026-01-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
        { name: "지역 미입력도 전국 통과", inputSnapshot: { residenceCityCode: "UNKNOWN", studentStatus: "ENROLLED", housingType: "DORMITORY", evaluationDate: "2026-01-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
        { name: "학생 상태 미입력", inputSnapshot: { residenceCityCode: "11000", studentStatus: "UNKNOWN", housingType: "DORMITORY", evaluationDate: "2026-01-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN","PASS","UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "부산청년플랫폼 공식 모집정보와 규칙 테스트 검증 완료",
  },
];
