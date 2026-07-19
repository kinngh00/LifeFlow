import type { UpdateDraftProgramConfigurationInput } from "@/features/admin/programs/schemas/update-draft-program-configuration.schema";
import { checkedAt, outcomes, rule, type VerifiedProgramDefinition } from "./first-verified-programs";

type Rules = UpdateDraftProgramConfigurationInput["rules"];

const nationalRegion = [{ coverageType: "NATIONAL", cityCode: null, districtCode: null, reviewRequired: false }] as const;
const rentalHousingTypes = ["JEONSE", "MONTHLY_RENT", "PUBLIC_RENTAL", "WITH_FAMILY", "DORMITORY", "OTHER"] as const;

const employmentFullRules = [
  rule(1, "AGE", "청년 연령 상한", "지원대상", { maximumAge: 39, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "부산 주민등록", "지원대상", { coverage: "CITY_WIDE", cityCode: "26000" }),
  rule(3, "EMPLOYMENT", "취업 상태", "지원내용 > 취업 후 근속", { allowedStatuses: ["EMPLOYED"] }),
  rule(4, "MANUAL_REVIEW", "상담기관 연계·정규직·근속 확인", "지원대상 및 지원내용", {
    reviewPrompt: "지정 청년 일자리 코디네이터 기관의 상담을 통한 취업인지, 정규직 여부와 6·9·12개월 근속을 확인하세요.",
    evidenceDescription: "상담·취업 연계 기록, 근로계약서, 재직증명",
  }),
] as Rules;

const lhYouthJeonseRules = [
  rule(1, "REGION", "전국 대상", "공고 대상지역", { coverage: "NATIONAL" }),
  rule(2, "HOUSING", "무주택 청년", "입주자격 > 무주택", { allowedHousingTypes: rentalHousingTypes, requiresNoHomeOwnership: true }),
  rule(3, "MANUAL_REVIEW", "1순위 유형·소득·자산·권리분석 확인", "입주자격 및 신청절차", {
    reviewPrompt: "대학생·취업준비생·19~39세 중 해당 유형, 1순위 자격, 소득·자산과 LH의 대상주택 권리분석 결과를 확인하세요.",
    evidenceDescription: "가구·수급자격·학적·졸업·고용·소득·자산 및 대상주택 자료",
  }),
] as Rules;

const separateHousingBenefitRules = [
  rule(1, "AGE", "분리지급 청년 연령", "청년 주거급여 신청안내", { minimumAge: 19, maximumAge: 29, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "주거급여 신청안내", { coverage: "NATIONAL" }),
  rule(3, "HOUSING", "부모와 별도 임차 거주", "청년 주거급여 분리지급", { allowedHousingTypes: ["JEONSE", "MONTHLY_RENT"] }),
  rule(4, "MANUAL_REVIEW", "부모가구 수급·미혼·분리거주 심사", "청년 주거급여 분리지급", {
    reviewPrompt: "부모가구의 주거급여 수급, 미혼 여부, 취학·구직 등 분리거주 사유, 주소·임대차·임차료 지급 증빙을 확인하세요.",
    evidenceDescription: "부모가구 수급자료, 가족관계, 주민등록, 임대차계약과 임차료 지급 내역",
  }),
] as Rules;

const buttimokRules = [
  rule(1, "AGE", "청년 연령", "대출 대상 > 세대주", { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "상품 안내", { coverage: "NATIONAL" }),
  rule(3, "HOUSING", "무주택 전세 거주", "대출 대상 > 무주택", { allowedHousingTypes: ["JEONSE"], requiresNoHomeOwnership: true }),
  rule(4, "MANUAL_REVIEW", "세대주·소득·자산·신용·계약 심사", "대출 대상 및 신청시기", {
    reviewPrompt: "세대주, 부부합산 소득·순자산, 신용, 중복대출, 임대차계약과 계약일 기준 신청기한을 수탁은행에서 확인하세요.",
    evidenceDescription: "세대·소득·자산·신용·대출·임대차계약 자료",
  }),
] as Rules;

const guaranteedMonthlyRentRules = [
  rule(1, "AGE", "청년 연령", "대출 대상", { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" }),
  rule(2, "REGION", "전국 대상", "상품 안내", { coverage: "NATIONAL" }),
  rule(3, "HOUSING", "무주택 월세 거주", "대출 대상 및 대상주택", { allowedHousingTypes: ["MONTHLY_RENT"], requiresNoHomeOwnership: true }),
  rule(4, "MANUAL_REVIEW", "단독세대주·소득·자산·신용·계약 심사", "대출 대상 및 신청시기", {
    reviewPrompt: "단독세대주, 부부합산 소득·순자산, 신용, 중복대출, 대상주택과 계약일 기준 신청기한을 수탁은행에서 확인하세요.",
    evidenceDescription: "세대·소득·자산·신용·대출·임대차계약 자료",
  }),
] as Rules;

export const thirdVerifiedPrograms: VerifiedProgramDefinition[] = [
  {
    create: {
      program: { slug: "busan-youth-employment-success-full-package", category: "YOUTH_EMPLOYMENT", managingOrganization: "부산광역시", operatingOrganization: "부산경영자총협회·부산경제진흥원" },
      version: {
        title: "2026년 부산청년 취업성공풀(Full) 패키지 지원",
        shortDescription: "지정 상담기관을 통해 취업한 부산 청년에게 1년 근속 기준 최대 100만 원을 지원합니다.",
        fullDescription: "청년 일자리 코디네이터의 상담을 거쳐 정규직으로 취업한 부산 청년의 장기근속을 지원하는 2026년 사업입니다.",
        targetSummary: "채용일 기준 부산 주민등록 39세 이하 청년 중 지정 상담기관을 통해 정규직 취업 후 근속한 사람",
        benefitType: "근속지원금", amountType: "MAXIMUM", maximumAmount: "1000000", amountUnit: "원", amountDescription: "6개월 50만 원, 9개월 25만 원, 12개월 25만 원으로 최대 100만 원",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-01-01", applicationEndDate: "2026-12-31",
        applicationMethod: "취업 상담을 받은 지정기관에 방문·팩스·이메일 신청", applicationUrl: "https://young.busan.go.kr/index.nm?menuCd=266",
        contactInformation: "부산경영자총협회 051-316-7411, 부산경제진흥원 051-600-1338", requiredDocuments: ["구직신청서", "사업참여 신청서", "개인정보 수집·이용 동의서"],
        cautionText: "공식 페이지의 신청기간 ‘2026년 1월~12월’을 달력 연도의 첫날과 마지막 날로 정규화했습니다. 상담기관 연계, 정규직 및 근속 증빙은 별도 확인이 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "부산광역시", documentTitle: "부산청년 취업성공풀(Full) 패키지 지원", sourceUrl: "https://young.busan.go.kr/index.nm?menuCd=266", documentIdentifier: "BUSAN-YOUTH-MENU-266-2026", checkedAt, isPrimary: true }],
      regions: [{ coverageType: "CITY_WIDE", cityCode: "26000", districtCode: "ALL", reviewRequired: false }], rules: employmentFullRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "EMPLOYED", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", employmentStatus: "EMPLOYED", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", employmentStatus: "EMPLOYED", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "FAIL", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "미취업 상태", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "UNEMPLOYED", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "PASS", "FAIL", "UNKNOWN"]), requiredForPublish: true },
        { name: "취업상태 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", employmentStatus: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN", "UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "부산청년플랫폼 2026년 공식 사업정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "lh-youth-jeonse-rental", category: "YOUTH_HOUSING", managingOrganization: "국토교통부", operatingOrganization: "한국토지주택공사" },
      version: {
        title: "2026년 청년 전세임대 1순위 입주자 수시모집", shortDescription: "LH가 기존주택을 전세계약한 뒤 1순위 청년에게 저렴하게 재임대합니다.",
        fullDescription: "LH 청년전세임대 장기 제도의 2026년 1순위 수시모집 공고입니다.", targetSummary: "무주택 미혼 청년 중 대학생·취업준비생·19~39세 유형과 1순위 요건을 충족하는 사람",
        benefitType: "전세임대주택", amountType: "FORMULA", amountDescription: "지역별 지원한도와 임대조건은 2026년 모집 공고 및 LH 권리분석 결과에 따라 결정",
        applicationType: "FIXED_PERIOD", applicationStartDate: "2026-02-24", applicationEndDate: "2026-12-31", applicationMethod: "LH청약플러스 온라인 신청", applicationUrl: "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancList.do?aisTpCd=17&panSs=%EA%B3%B5%EA%B3%A0%EC%A4%91&srchAisTpCd=17&srchUppAisTpCd=13&uppAisTpaCd=13",
        contactInformation: "LH 콜센터 1600-1004", requiredDocuments: ["주민등록 및 가족관계 서류", "1순위 자격 증빙", "학적·졸업·고용 관련 증빙"], cautionText: "현재 접수중. 1순위 유형, 소득·자산, 공급목표와 대상주택 권리분석에 따라 신청 또는 계약이 제한될 수 있습니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "PUBLIC_NOTICE", organizationName: "한국토지주택공사", documentTitle: "2026년 청년 전세임대 1순위 입주자 수시모집", sourceUrl: "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancList.do?aisTpCd=17&panSs=%EA%B3%B5%EA%B3%A0%EC%A4%91&srchAisTpCd=17&srchUppAisTpCd=13&uppAisTpaCd=13", documentIdentifier: "LH-2026-YOUTH-JEONSE-FIRST-PRIORITY", publishedAt: "2026-02-24", checkedAt, isPrimary: true }],
      regions: [...nationalRegion], rules: lhYouthJeonseRules,
      testCases: [
        { name: "전국 무주택 후보", inputSnapshot: { residenceCityCode: "26000", housingType: "WITH_FAMILY", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 지역도 통과", inputSnapshot: { residenceCityCode: "11000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "지역 미입력도 전국 통과", inputSnapshot: { residenceCityCode: "UNKNOWN", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "주택 소유", inputSnapshot: { residenceCityCode: "26000", housingType: "OWNED", homeOwnershipStatus: "OWNS_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "FAIL", "UNKNOWN"]), requiredForPublish: true },
        { name: "주거정보 미입력", inputSnapshot: { residenceCityCode: "26000", housingType: "UNKNOWN", homeOwnershipStatus: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "UNKNOWN", "UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "LH청약플러스 2026년 수시모집 공고와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "youth-housing-benefit-separate-payment", category: "YOUTH_HOUSING", managingOrganization: "국토교통부", operatingOrganization: "보장기관·주소지 행정복지센터" },
      version: {
        title: "청년 주거급여 분리지급", shortDescription: "주거급여 수급가구의 19~29세 미혼자녀가 부모와 따로 거주하면 주거급여를 분리 지급합니다.",
        fullDescription: "취학·구직 등의 목적으로 부모와 별도 거주하는 청년가구원에게 주거급여를 분리 산정하는 전국 제도입니다.", targetSummary: "주거급여 수급가구의 만 19세 이상 30세 미만 미혼자녀 중 취학·구직 등으로 부모와 별도 임차 거주하는 사람",
        benefitType: "주거급여", amountType: "FORMULA", amountDescription: "청년 거주지역·가구원수별 기준임대료와 실제임차료, 소득인정액에 따라 산정",
        applicationType: "ALWAYS_OPEN", applicationMethod: "주민등록상 주소지 행정복지센터 방문 또는 복지로 온라인 신청", applicationUrl: "https://www.myhome.go.kr/hws/portal/dgn/selectSelfDiagnosisYouthHousView.do",
        contactInformation: "주거급여 콜센터 1600-0777, 보건복지상담센터 129", requiredDocuments: ["청년 명의 임대차계약서", "임차료 지급 내역", "미혼 및 분리거주 사유 증빙", "전입신고"], cautionText: "부모가구의 주거급여 수급, 분리거주 사유와 주소 기준, 가구·소득·재산 및 실제 임차관계는 보장기관 심사가 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "국토교통부 마이홈포털", documentTitle: "청년·신혼부부 주거지원 자가진단", sourceUrl: "https://www.myhome.go.kr/hws/portal/dgn/selectSelfDiagnosisYouthHousView.do", documentIdentifier: "MYHOME-YOUTH-HOUSING-BENEFIT-2026", checkedAt, isPrimary: true }],
      regions: [...nationalRegion], rules: separateHousingBenefitRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "2000-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "연령 미달", inputSnapshot: { birthDate: "2010-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "30세 이상", inputSnapshot: { birthDate: "1990-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "부모와 동거", inputSnapshot: { birthDate: "2000-01-01", residenceCityCode: "26000", housingType: "WITH_FAMILY", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "PASS", "FAIL", "UNKNOWN"]), requiredForPublish: true },
        { name: "지역 미입력도 전국 통과", inputSnapshot: { birthDate: "2000-01-01", residenceCityCode: "UNKNOWN", housingType: "JEONSE", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "마이홈포털 2026년 공식 안내와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "youth-buttimok-jeonse-loan", category: "YOUTH_HOUSING", managingOrganization: "국토교통부 주택도시기금", operatingOrganization: "주택도시기금 수탁은행" },
      version: {
        title: "청년전용 버팀목전세자금", shortDescription: "19~34세 무주택 세대주에게 임차보증금의 80% 이내에서 최대 1억 5천만 원을 대출합니다.",
        fullDescription: "전세자금이 부족한 청년을 위한 주택도시기금의 전국 단위 전세자금 대출상품입니다.", targetSummary: "19~34세 무주택 세대주 또는 예비세대주 중 소득·자산·신용·계약 요건을 충족하는 사람",
        benefitType: "전세자금 대출", amountType: "MAXIMUM", maximumAmount: "150000000", amountUnit: "원", amountDescription: "임차보증금의 80% 이내, 최대 1억 5천만 원; 공식 페이지 기준 금리 연 2.2~3.3%",
        applicationType: "ALWAYS_OPEN", applicationMethod: "기금e든든 온라인 신청 후 수탁은행 방문 또는 수탁은행 대면 신청", applicationUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp",
        contactInformation: "주택도시보증공사 1566-9009, 자산심사 1551-3119 및 수탁은행", requiredDocuments: ["임대차계약서와 보증금 지급 증빙", "세대·소득·자산·재직 확인서류"], cautionText: "달력상 상시 운영 상품이지만 신규계약은 잔금지급일과 전입일 중 빠른 날부터 3개월 이내 등 계약별 신청기한이 있습니다. 최종 대출 가능 여부는 수탁은행 심사가 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "국토교통부 주택도시기금", documentTitle: "청년전용 버팀목전세자금 대출안내", sourceUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp", documentIdentifier: "NHUF-YOUTH-BUTTIMOK-JEONSE-2026", checkedAt, isPrimary: true }],
      regions: [...nationalRegion], rules: buttimokRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 지역도 통과", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "주택 소유", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "OWNED", homeOwnershipStatus: "OWNS_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "PASS", "FAIL", "UNKNOWN"]), requiredForPublish: true },
        { name: "주거정보 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "UNKNOWN", housingType: "UNKNOWN", homeOwnershipStatus: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN", "UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "주택도시기금 2026년 공식 상품정보와 규칙 테스트 검증 완료",
  },
  {
    create: {
      program: { slug: "youth-guaranteed-monthly-rent-loan", category: "YOUTH_HOUSING", managingOrganization: "국토교통부 주택도시기금", operatingOrganization: "주택도시기금 수탁은행" },
      version: {
        title: "청년전용 보증부월세대출", shortDescription: "19~34세 무주택 단독세대주에게 보증금 최대 4,500만 원과 월세 최대 1,200만 원을 저리 대출합니다.",
        fullDescription: "청년의 전월세보증금과 월세를 지원하는 주택도시기금의 전국 단위 대출상품입니다.", targetSummary: "19~34세 무주택 단독세대주 또는 예비세대주 중 소득·자산·신용·계약 요건을 충족하는 사람",
        benefitType: "보증금·월세 대출", amountType: "FORMULA", amountDescription: "보증금 최대 4,500만 원, 월세 최대 1,200만 원(24개월 기준 월 50만 원); 보증금 연 1.3%, 월세 연 0~1.0%",
        applicationType: "ALWAYS_OPEN", applicationMethod: "기금e든든 온라인 신청 후 수탁은행 방문 또는 수탁은행 대면 신청", applicationUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020701.jsp",
        contactInformation: "주택도시보증공사 1566-9009, 자산심사 1551-3119 및 수탁은행", requiredDocuments: ["임대차계약서와 보증금 지급 증빙", "세대·소득·자산·재직 확인서류"], cautionText: "달력상 상시 운영 상품이지만 신규계약은 잔금지급일과 전입일 중 빠른 날부터 3개월 이내 등 계약별 신청기한이 있습니다. 대상주택·신용·중복대출과 최종 승인 여부는 수탁은행 심사가 필요합니다.", checkedAt,
      },
    },
    configuration: {
      sources: [{ sourceType: "OFFICIAL_PAGE", organizationName: "국토교통부 주택도시기금", documentTitle: "청년전용 보증부월세대출 안내", sourceUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020701.jsp", documentIdentifier: "NHUF-YOUTH-GUARANTEED-MONTHLY-2026", checkedAt, isPrimary: true }],
      regions: [...nationalRegion], rules: guaranteedMonthlyRentRules,
      testCases: [
        { name: "자동조건 충족", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "연령 초과", inputSnapshot: { birthDate: "1980-01-01", residenceCityCode: "26000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["FAIL", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "부산 외 지역도 통과", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "11000", housingType: "MONTHLY_RENT", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "PASS", "UNKNOWN"]), requiredForPublish: true },
        { name: "전세 거주", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "26000", housingType: "JEONSE", homeOwnershipStatus: "NO_HOME", evaluationDate: checkedAt }, expectedOverallStatus: "NOT_ELIGIBLE", expectedRuleOutcomes: outcomes(["PASS", "PASS", "FAIL", "UNKNOWN"]), requiredForPublish: true },
        { name: "주거정보 미입력", inputSnapshot: { birthDate: "1995-01-01", residenceCityCode: "UNKNOWN", housingType: "UNKNOWN", homeOwnershipStatus: "UNKNOWN", evaluationDate: checkedAt }, expectedOverallStatus: "NEEDS_REVIEW", expectedRuleOutcomes: outcomes(["PASS", "PASS", "UNKNOWN", "UNKNOWN"]), requiredForPublish: true },
      ],
    }, publicationReason: "주택도시기금 2026년 공식 상품정보와 규칙 테스트 검증 완료",
  },
];
