import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { QuestionnaireForm } from "@/features/questionnaire/ui/questionnaire-form";
import { BenefitResults } from "@/features/benefits/ui/benefit-results";
import { BenefitDetail } from "@/features/benefits/ui/benefit-detail";

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}
const emptySession = { data: { hasSession: false, profile: {} } };
const results = { data: { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }, summary: { eligible: 0, needsReview: 0, notEligible: 0, undetermined: 0 }, evaluatedAt: "2026-07-19" } };
const detail = { data: { programId:"p1",versionId:"v1",slug:"public-test",category:"YOUTH_EMPLOYMENT",managingOrganization:"부산광역시",operatingOrganization:null,versionNumber:1,title:"공개 테스트 제도",shortDescription:"요약",fullDescription:"상세",targetSummary:"청년",benefitType:"서비스",amount:{type:"UNDETERMINED",minimum:null,maximum:null,unit:null,description:null},application:{type:"ALWAYS_OPEN",startDate:null,endDate:null,status:"ALWAYS_OPEN",isOpen:true,method:"온라인",url:"https://apply.example.com"},contactInformation:"문의",requiredDocuments:[],cautionText:null,checkedAt:"2026-07-19",sources:[{organizationName:"부산",documentTitle:"공식 안내",sourceUrl:"https://official.example.com",checkedAt:"2026-07-19",isPrimary:true}],eligibility:{status:"ELIGIBLE",label:"신청 가능성 높음",ruleResults:[{ruleType:"AGE",outcome:"PASS",approvedMessage:"연령 조건을 충족합니다.",userValueSummary:26,criteriaSummary:"만 19~34세",sourceLocation:"대상",reviewRequired:false}]}} };

beforeEach(() => { push.mockReset(); vi.stubGlobal("fetch", vi.fn(() => response(emptySession))); vi.stubGlobal("confirm", vi.fn(() => true)); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("NATIONAL public detail", () => {
  it("shows that there is no residence restriction", async () => {
    vi.mocked(fetch).mockImplementation(() => response({
      data: { ...detail.data, residenceRestriction: "부산 거주 필수 아님" },
    }));
    render(<BenefitDetail slug="public-test" />);
    expect(await screen.findByText((_, element) => element?.textContent === "거주지 제한: 부산 거주 필수 아님")).toBeInTheDocument();
  });
});

describe("사용자 설문 UI", () => {
  it("개인정보 최소 수집 안내를 표시한다", async () => { render(<QuestionnaireForm/>); expect(await screen.findByText(/이름·연락처/)).toBeInTheDocument(); });
  it("단계 이동을 제공한다", async () => { render(<QuestionnaireForm/>); await screen.findByText(/이름·연락처/); fireEvent.click(screen.getByRole("button",{name:"다음"})); expect(screen.getByRole("heading",{name:"기본 조건"})).toBeInTheDocument(); });
  it("단계별 필수 입력을 검증한다", async () => { render(<QuestionnaireForm/>); await screen.findByText(/이름·연락처/); fireEvent.click(screen.getByRole("button",{name:"다음"})); fireEvent.click(screen.getByRole("button",{name:"다음"})); expect(await screen.findByRole("alert")).toHaveTextContent("생년월일"); });
  it("세션의 생년월일을 복원한다", async () => { vi.mocked(fetch).mockImplementationOnce(()=>response({data:{hasSession:true,profile:{birthDate:"2000-01-01",residenceCityCode:"26000"}}})); render(<QuestionnaireForm/>); await screen.findByText(/이름·연락처/); fireEvent.click(screen.getByRole("button",{name:"다음"})); expect(screen.getByLabelText("생년월일")).toHaveValue("2000-01-01"); });
  it("생년월일 모름 선택을 제공한다", async () => { render(<QuestionnaireForm/>); await screen.findByText(/이름·연락처/); fireEvent.click(screen.getByRole("button",{name:"다음"})); fireEvent.change(screen.getByLabelText("생년월일 입력 방식"),{target:{value:"UNKNOWN"}}); expect(screen.queryByLabelText("생년월일")).not.toBeInTheDocument(); });
  it("전체 초기화 API를 호출한다", async () => { render(<QuestionnaireForm/>); await screen.findByText(/이름·연락처/); fireEvent.click(screen.getByRole("button",{name:"전체 초기화"})); await waitFor(()=>expect(fetch).toHaveBeenCalledWith("/api/questionnaire/session",expect.objectContaining({method:"DELETE"}))); });
  it("복원 중 로딩 상태를 표시한다", () => { vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{})); render(<QuestionnaireForm/>); expect(screen.getByRole("status")).toHaveTextContent("불러오는 중"); });
  it("세션 복원 오류를 표시한다", async () => { vi.mocked(fetch).mockRejectedValueOnce(new Error("network")); render(<QuestionnaireForm/>); expect(await screen.findByRole("alert")).toHaveTextContent("불러오지 못했습니다"); });
});

describe("추천 목록 UI", () => {
  it("추천 빈 상태를 표시한다", async () => { vi.mocked(fetch).mockImplementation(()=>response(results)); render(<BenefitResults/>); expect(await screen.findByText(/해당하는 공개 지원제도가 없습니다/)).toBeInTheDocument(); });
  it("상태 필터로 재평가한다", async () => { vi.mocked(fetch).mockImplementation(()=>response(results)); render(<BenefitResults/>); await screen.findByText(/해당하는 공개/); fireEvent.change(screen.getByLabelText("상태 필터"),{target:{value:"ELIGIBLE"}}); await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith("/api/recommendations/evaluate",expect.objectContaining({body:expect.stringContaining("ELIGIBLE")}))); });
  it("세션 없음 오류에서 설문 링크를 표시한다", async () => { vi.mocked(fetch).mockImplementation(()=>response({error:{code:"QUESTIONNAIRE_SESSION_REQUIRED"}},400)); render(<BenefitResults/>); expect(await screen.findByRole("alert")).toHaveTextContent("조건 입력"); });
  it("추천 로딩 상태를 표시한다", () => { vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{})); render(<BenefitResults/>); expect(screen.getByRole("status")).toHaveTextContent("계산하는 중"); });
});

describe("공개 상세 UI", () => {
  it("개인 판정 근거를 표시한다", async () => { vi.mocked(fetch).mockImplementation(()=>response(detail)); render(<BenefitDetail slug="public-test"/>); expect(await screen.findByText("연령 조건을 충족합니다.")).toBeInTheDocument(); expect(screen.getByText("PASS")).toBeInTheDocument(); });
  it("공식 출처를 안전한 새 창 링크로 표시한다", async () => { vi.mocked(fetch).mockImplementation(()=>response(detail)); render(<BenefitDetail slug="public-test"/>); const link=await screen.findByRole("link",{name:/공식 안내/}); expect(link).toHaveAttribute("target","_blank"); expect(link).toHaveAttribute("rel","noopener noreferrer"); });
});
