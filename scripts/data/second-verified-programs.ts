import type { UpdateDraftProgramConfigurationInput } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";
import { checkedAt, outcomes, rule, type VerifiedProgramDefinition } from "./first-verified-programs";

type Rules = UpdateDraftProgramConfigurationInput["rules"];
const cityRegion = [{ coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL", reviewRequired: false }] as const;

const dreamClosetRules = [
  rule(1, "AGE", "청년 연령", "사업내용 > 지원대상", { minimumAge: 15, maximumAge: 39, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "부산 거주·거소", "사업내용 > 지원대상", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "MANUAL_REVIEW", "입사면접 증빙·예약 확인", "사업내용 및 지원방법", { reviewPrompt: "실제 입사면접 증빙과 대여점 예약 가능 여부를 확인하세요.", evidenceDescription: "면접 증빙 및 예약 내역" }),
] as Rules;

const traineeRules = [
  rule(1, "REGION", "부산 거주", "모집 공고 및 첨부 공고문", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(2, "MANUAL_REVIEW", "첨부 공고문 자격·선발 확인", "첨부 공고문", { reviewPrompt: "연령, 학력·졸업 경과기간, 취업 상태, 배치 가능 여부와 제외대상을 첨부 공고문으로 확인하세요.", evidenceDescription: "주민등록·학력·고용상태 및 선발 증빙" }),
] as Rules;

const employmentSupportRules = [
  rule(1, "AGE", "청년특례 연령", "수급자격 > I유형 선발형(청년특례)", { minimumAge: 15, maximumAge: 34, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "취업지원 신청", { coverage: "NATIONAL" }),
  {
    displayOrder: 3, ruleType: "INCOME_BAND", label: "중위소득 120% 이하", description: "청년특례 소득 구간을 확인합니다.",
    expectedCondition: { allowedBands: ["50% 이하", "100% 이하", "120% 이하"], referenceYear: 2026 }, required: true, reviewRequired: false,
    missingValueBehavior: "UNKNOWN", passMessage: "입력한 소득 구간은 120% 이하입니다.", failureMessage: "입력한 소득 구간은 120%를 초과합니다.", unknownMessage: "소득 구간을 추가 확인해야 합니다.",
    sourceReference: { sourceIndex: 0 }, sourceLocation: "수급자격 > I유형 선발형(청년특례)", active: true,
  },
  rule(4, "MANUAL_REVIEW", "재산·취업경험·참여제한 심사", "수급자격 및 취업지원 신청 절차", { reviewPrompt: "가구원 합산 재산, 취업경험, 구직등록, 참여·중복 제한과 최종 유형을 고용센터 심사로 확인하세요.", evidenceDescription: "가구·재산·취업경험 및 참여이력 자료" }),
] as Rules;

const guaranteeRules = [
  rule(1, "AGE", "청년 연령", "지원내용 > 청년 정의", { minimumAge: 18, maximumAge: 39, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "부산 주민등록", "지원대상", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "HOUSING", "무주택 전세 거주", "지원대상 및 지원제외", { allowedHousingTypes: ["JEONSE"], requiresNoHomeOwnership: true }),
  rule(4, "MANUAL_REVIEW", "보증·보증금·소득·제외대상 심사", "지원대상 및 지원제외", { reviewPrompt: "유효한 반환보증, 임차보증금 3억원 이하, 청년 연소득 5천만원 이하와 제외대상을 확인하세요.", evidenceDescription: "보증서, 임대차계약, 소득·주택 자료" }),
] as Rules;

const meomuljariRules = [
  rule(1, "AGE", "청년 연령", "지원대상", { minimumAge: 19, maximumAge: 39, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "부산 주민등록", "지원대상", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "HOUSING", "무주택 임차 거주", "지원대상 및 대상주택", { allowedHousingTypes: ["JEONSE", "MONTHLY_RENT"], requiresNoHomeOwnership: true }),
  rule(4, "MANUAL_REVIEW", "소득·주택·금융기관 심사", "소득기준, 대상주택 및 지원제외", { reviewPrompt: "연소득, 세대주 범위, 보증금·전월세전환율, 중복 주거지원 및 은행·보증기관 심사를 확인하세요.", evidenceDescription: "임대차계약, 소득·세대·금융심사 자료" }),
] as Rules;

export const secondVerifiedPrograms: VerifiedProgramDefinition[] = [
  {
    create: { program: { slug: "busan-dream-closet", category: "YOUTH_EMPLOYMENT", managingOrganization: "부산광역시", operatingOrganization: "부산경제진흥원" }, version: {
      title: "2026년 정장대여서비스 드림옷장", shortDescription: "부산 청년 구직자에게 입사면접용 정장을 3박 4일 무료 대여합니다.", fullDescription: "부산 거주·거소 청년 구직자의 입사면접 비용 부담을 줄이는 정장 무료 대여 서비스입니다.", targetSummary: "부산 거주·거소 15~39세 청년 구직자 중 실제 입사면접 증빙이 있는 사람", benefitType: "면접 정장 대여", amountType: "IN_KIND", amountDescription: "자켓·셔츠·하의·구두 등 입사면접 정장 3박 4일 무료 대여", applicationType: "ALWAYS_OPEN", applicationMethod: "부산일자리정보망에서 온라인 예약 후 대여점 방문", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=32", contactInformation: "부산경제진흥원 051-600-1353", requiredDocuments: ["입사면접 증빙자료"], cautionText: "모의면접과 대학원 면접은 지원하지 않으며 실제 예약 가능 여부를 확인해야 합니다.", checkedAt,
    } },
    configuration: { sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "정장대여서비스(드림옷장)", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=32", documentIdentifier: "BUSAN-YOUTH-MENU-32-2026", checkedAt, isPrimary: true }], regions: [...cityRegion], rules: dreamClosetRules, testCases: [
      { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "연령 미달", inputSnapshot: { birthDate: "2012-01-01", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "부산 외 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
      { name: "거주지 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN","UNKNOWN"]), requiredForPublish: true },
    ] }, publicationReason: "부산청년플랫폼 공식 사업정보와 규칙 테스트 검증 완료",
  },
  {
    create: { program: { slug: "busan-employment-trainee", category: "YOUTH_EMPLOYMENT", managingOrganization: "부산광역시", operatingOrganization: null }, version: {
      title: "2026년 상반기 부산시 취업연수생 모집", shortDescription: "부산시와 공공·비영리기관에서 8주간 행정업무와 직장체험 연수를 제공합니다.", fullDescription: "2026년 상반기 취업연수생 고용사업의 회차성 모집 공고입니다.", targetSummary: "부산 거주 등 첨부 공고문의 자격과 선발조건을 충족하는 취업연수 희망자", benefitType: "직장체험·직무연수", amountType: "UNDETERMINED", amountDescription: "8주간 행정업무지원·직장체험·직무능력배양; 보수는 첨부 공고문 확인", applicationType: "FIXED_PERIOD", applicationStartDate: "2026-02-09", applicationEndDate: "2026-02-20", applicationMethod: "청년부산잡스 온라인 신청", applicationUrl: "https://young.busan.go.kr/article/view.nm?article_id=3790&menuCd=153", contactInformation: "부산광역시 051-120", requiredDocuments: ["첨부 공고문에서 요구하는 신청서류"], cautionText: "현재 접수 종료. 공개 본문에 없는 세부 자격과 보수는 첨부 공고문을 직접 확인해야 합니다.", checkedAt,
    } },
    configuration: { sources: [{ sourceType: "PUBLIC_NOTICE", organizationName: "부산광역시", documentTitle: "2026년 상반기 취업연수생 모집 공고", sourceUrl: "https://young.busan.go.kr/article/view.nm?article_id=3790&menuCd=153", documentIdentifier: "BUSAN-YOUTH-ARTICLE-3790", publishedAt: "2026-02-06", checkedAt, isPrimary: true }], regions: [...cityRegion], rules: traineeRules, testCases: [
      { name: "부산 거주 지원자", inputSnapshot: { residenceCityCode: "26000", employmentStatus: "UNEMPLOYED", evaluationDate: "2026-02-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "부산 외 거주", inputSnapshot: { residenceCityCode: "11000", evaluationDate: "2026-02-10" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","UNKNOWN"]), requiredForPublish: true },
      { name: "거주지 미입력", inputSnapshot: { residenceCityCode: "UNKNOWN", evaluationDate: "2026-02-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["UNKNOWN","UNKNOWN"]), requiredForPublish: true },
      { name: "재학생 세부조건 확인", inputSnapshot: { residenceCityCode: "26000", studentStatus: "ENROLLED", evaluationDate: "2026-02-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "취업상태 세부조건 확인", inputSnapshot: { residenceCityCode: "26000", employmentStatus: "EMPLOYED", evaluationDate: "2026-02-10" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","UNKNOWN"]), requiredForPublish: true },
    ] }, publicationReason: "부산광역시 공식 모집 공고와 규칙 테스트 검증 완료",
  },
  {
    create: { program: { slug: "national-employment-support-system", category: "YOUTH_EMPLOYMENT", managingOrganization: "고용노동부", operatingOrganization: "고용센터 및 위탁기관" }, version: {
      title: "2026년 국민취업지원제도 I유형 청년특례", shortDescription: "15~34세 청년특례 대상자에게 취업지원서비스와 월 60만 원씩 6개월의 구직촉진수당을 제공합니다.", fullDescription: "국민취업지원제도 I유형 선발형 청년특례의 전국 단위 안내입니다.", targetSummary: "15~34세, 중위소득 120% 이하이며 재산·참여 요건 등을 충족하는 구직자", benefitType: "취업지원·구직촉진수당", amountType: "FORMULA", amountDescription: "월 60만 원×6개월, 부양가족 요건에 따라 월 최대 40만 원 추가 가능", applicationType: "ALWAYS_OPEN", applicationMethod: "고용24 구직등록 후 온라인 신청 또는 고용센터 방문", applicationUrl: "https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do", contactInformation: "고용노동부 고객상담센터 1350", requiredDocuments: ["취업지원 신청서", "가구·소득·재산 및 취업경험 확인자료"], cautionText: "재산, 취업경험, 가구원, 참여 제한과 최종 수급유형은 고용센터 심사가 필요합니다.", checkedAt,
    } },
    configuration: { sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "고용노동부 고용24", documentTitle: "국민취업지원제도 취업지원신청 소개", sourceUrl: "https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do", documentIdentifier: "WORK24-NATIONAL-EMPLOYMENT-SUPPORT-2026", checkedAt, isPrimary: true }], regions: [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false }], rules: employmentSupportRules, testCases: [
      { name: "청년특례 자동조건 충족", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "26000", incomeBand: "120% 이하", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", incomeBand: "120% 이하", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "소득구간 초과", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "26000", incomeBand: "150% 이하", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
      { name: "지역 미입력도 전국 통과", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "UNKNOWN", incomeBand: "100% 이하", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "소득 미입력", inputSnapshot: { birthDate: "1998-01-01", residenceCityCode: "11000", incomeBand: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN","UNKNOWN"]), requiredForPublish: true },
    ] }, publicationReason: "고용24 공식 청년특례 정보와 규칙 테스트 검증 완료",
  },
  {
    create: { program: { slug: "busan-jeonse-guarantee-fee-support", category: "YOUTH_HOUSING", managingOrganization: "국토교통부·부산광역시", operatingOrganization: "부산광역시 구·군" }, version: {
      title: "2026년 전세보증금반환보증 보증료 지원", shortDescription: "부산 거주 청년의 기납부 전세보증금반환보증 보증료를 최대 40만 원 지원합니다.", fullDescription: "유효한 전세보증금반환보증에 가입한 부산 무주택 임차인의 보증료를 지원합니다.", targetSummary: "부산 거주 18~39세 무주택 청년 중 보증·보증금·연소득 요건 충족자", benefitType: "보증료 환급", amountType: "MAXIMUM", maximumAmount: "400000", amountUnit: "원", amountDescription: "청년 기납부 보증료 전액, 최대 40만 원", applicationType: "BUDGET_EXHAUSTION", applicationStartDate: "2026-01-01", applicationMethod: "정부24 온라인 또는 주민등록상 주소지 관할 구청 방문", applicationUrl: "https://www.busan.go.kr/depart/reguarantee", contactInformation: "주민등록상 주소지 관할 부산광역시 구청", requiredDocuments: ["전세보증금반환보증 보증서", "임대차계약서", "부동산등기사항전부증명서", "혼인관계증명서", "소득증빙서류"], cautionText: "예산 소진 여부와 보증 효력·보증금·소득·주택소유·제외대상은 서류 심사가 필요합니다.", checkedAt,
    } },
    configuration: { sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "전세보증금반환보증 보증료 지원 안내", sourceUrl: "https://www.busan.go.kr/depart/reguarantee", documentIdentifier: "BUSAN-REGUARANTEE-2026", checkedAt, isPrimary: true }], regions: [...cityRegion], rules: guaranteeRules, testCases: [
      { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "부산 외 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "주택 소유", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "OWNS_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
      { name: "주거정보 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "UNKNOWN", homeOwnershipStatus: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN","UNKNOWN"]), requiredForPublish: true },
    ] }, publicationReason: "부산광역시 공식 2026 안내와 규칙 테스트 검증 완료",
  },
  {
    create: { program: { slug: "busan-meomuljari-loan", category: "YOUTH_HOUSING", managingOrganization: "부산광역시", operatingOrganization: "부산은행·한국주택금융공사" }, version: {
      title: "2026년 8월 머물자리론 신규 신청", shortDescription: "부산 무주택 청년의 임차보증금 대출과 소득별 이자를 지원합니다.", fullDescription: "청년 임차보증금 대출 및 대출이자 지원사업의 2026년 8월 신규 신청 회차입니다.", targetSummary: "부산 주민등록 19~39세 무주택 청년 세대주 중 소득·대상주택·금융심사 요건 충족자", benefitType: "임차보증금 대출·이자 지원", amountType: "FORMULA", amountDescription: "대출 최대 1억원(보증금 90% 이내), 소득에 따라 부산시가 금리 2.0% 또는 2.5% 지원", applicationType: "FIXED_PERIOD", applicationStartDate: "2026-08-01", applicationEndDate: "2026-08-10", applicationMethod: "부산청년플랫폼 온라인 신청 후 부산은행 대출심사", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=0", contactInformation: "부산광역시 청년정책과 051-120", requiredDocuments: ["주민등록등본", "가족관계증명서", "임대차계약서 전체 사본"], cautionText: "8월 신규 신청 회차입니다. 계약 시기, 세대주 범위, 소득·주택 및 은행·보증기관 심사를 확인해야 합니다.", checkedAt,
    } },
    configuration: { sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "2026년 청년 임차보증금 대출 및 대출이자 지원(머물자리론)", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=0", documentIdentifier: "BUSAN-MEOMULJARI-2026-AUGUST", checkedAt, isPrimary: true }], regions: [...cityRegion], rules: meomuljariRules, testCases: [
      { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-08-05" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-08-05" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL","PASS","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "부산 외 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: "2026-08-05" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","FAIL","PASS","UNKNOWN"]), requiredForPublish: true },
      { name: "주택 소유", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "OWNS_HOME", evaluationDate: "2026-08-05" }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS","PASS","FAIL","UNKNOWN"]), requiredForPublish: true },
      { name: "주거정보 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "UNKNOWN", homeOwnershipStatus: "UNKNOWN", evaluationDate: "2026-08-05" }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS","PASS","UNKNOWN","UNKNOWN"]), requiredForPublish: true },
    ] }, publicationReason: "부산청년플랫폼 2026 공식 안내와 규칙 테스트 검증 완료",
  },
];
