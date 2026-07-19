import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { z } from "zod";

const push=vi.fn();const replace=vi.fn();const refresh=vi.fn();let params=new URLSearchParams();
vi.mock("next/navigation",()=>({useRouter:()=>({push,replace,refresh}),useSearchParams:()=>params,usePathname:()=>"/admin/programs"}));

import { AdminLoginForm } from "@/features/admin/ui/admin-login-form";
import { AdminProgramList,buildProgramListQuery } from "@/features/admin/ui/admin-program-list";
import { AdminProgramCreateForm } from "@/features/admin/ui/admin-program-create-form";
import { AdminProgramDetailView } from "@/features/admin/ui/admin-program-detail";
import { ProgramVersionVerification } from "@/features/admin/ui/program-version-verification";
import { StatusBadge } from "@/features/admin/ui/admin-ui";
import { AdminApiError,adminApi,adminErrorMessage } from "@/features/admin/ui/api-client";
import { conditionFor } from "@/features/admin/ui/draft-configuration-editor";

function response(body:unknown,status=200){return Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}}))}
const detail={id:"v1",programId:"p1",versionNumber:1,publicationStatus:"DRAFT",title:"테스트 제도",shortDescription:"요약",fullDescription:"상세",targetSummary:"청년",benefitType:"서비스",amountType:"UNDETERMINED",minimumAmount:null,maximumAmount:null,amountUnit:null,amountDescription:null,applicationType:"ALWAYS_OPEN",applicationStartDate:null,applicationEndDate:null,applicationMethod:"온라인",applicationUrl:null,contactInformation:"문의",requiredDocuments:[],cautionText:null,checkedAt:"2026-07-19",publishedAt:null,updatedAt:"2026-07-19T00:00:00Z",program:{id:"p1",slug:"test",archivedAt:null},sources:[],regions:[],rules:[],testCases:[]};
const readiness={programVersionId:"v1",ready:false,currentConfigurationHash:"a".repeat(64),latestTestRun:null,checks:[{code:"LATEST_TEST_PRESENT",passed:false,message:"최근 테스트가 필요합니다."}]};

beforeEach(()=>{push.mockReset();replace.mockReset();refresh.mockReset();params=new URLSearchParams();vi.stubGlobal("fetch",vi.fn());vi.stubGlobal("confirm",vi.fn(()=>true))});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});

describe("admin UI behavior",()=>{
 it("로그인 폼을 실제 API에 제출한다",async()=>{vi.mocked(fetch).mockImplementation(()=>response({admin:{id:"a1"},expiresAt:"2030"}));render(<AdminLoginForm/>);fireEvent.change(screen.getByLabelText("이메일"),{target:{value:"admin@example.com"}});fireEvent.change(screen.getByLabelText("비밀번호"),{target:{value:"correct horse battery staple"}});fireEvent.submit(screen.getByRole("button",{name:"로그인"}).closest("form")!);await waitFor(()=>expect(replace).toHaveBeenCalledWith("/admin"));expect(fetch).toHaveBeenCalledWith("/api/admin/auth/login",expect.objectContaining({method:"POST"}))});
 it("로그인 실패는 안전한 오류 메시지를 표시한다",async()=>{vi.mocked(fetch).mockImplementation(()=>response({error:{code:"AUTHENTICATION_FAILED",message:"이메일 또는 비밀번호를 확인해 주세요."}},401));render(<AdminLoginForm/>);fireEvent.change(screen.getByLabelText("이메일"),{target:{value:"admin@example.com"}});fireEvent.change(screen.getByLabelText("비밀번호"),{target:{value:"wrong password value"}});fireEvent.submit(screen.getByRole("button",{name:"로그인"}).closest("form")!);expect(await screen.findByRole("alert")).toHaveTextContent("관리자 로그인이 필요합니다")});
 it("프로그램 목록 빈 상태를 표시한다",async()=>{vi.mocked(fetch).mockImplementation(()=>response({items:[],page:1,pageSize:20,total:0,totalPages:0}));render(<AdminProgramList/>);expect(await screen.findByText("조건에 맞는 지원제도가 없습니다.")).toBeInTheDocument()});
 it("필터 쿼리를 불필요한 빈 값 없이 생성한다",()=>expect(buildProgramListQuery({search:"housing",category:"YOUTH_HOUSING",includeArchived:false})).toBe("search=housing&category=YOUTH_HOUSING"));
 it("프로그램 생성 폼의 빈 입력을 검증한다",async()=>{render(<AdminProgramCreateForm/>);fireEvent.submit(screen.getByRole("button",{name:"DRAFT 생성 후 구성 편집"}).closest("form")!);expect(await screen.findByRole("alert")).toBeInTheDocument();expect(fetch).not.toHaveBeenCalled()});
 it("상태 배지는 색상 외 텍스트도 표시한다",()=>{render(<StatusBadge status="PUBLISHED"/>);expect(screen.getByText("PUBLISHED")).toBeInTheDocument()});
 it("REGION 기본 폼은 부산 전체로 제한한다",()=>expect(conditionFor("REGION")).toEqual({cityCode:"26000",coverage:"CITY_WIDE"}));
 it("MANUAL_REVIEW 기본 폼은 자유 수식 대신 확인 질문을 사용한다",()=>expect(conditionFor("MANUAL_REVIEW")).toHaveProperty("reviewPrompt"));
 it("공통 API 클라이언트는 응답 스키마를 검증한다",async()=>{vi.mocked(fetch).mockImplementation(()=>response({value:"ok"}));await expect(adminApi("/api/test",{},z.object({value:z.string()}))).resolves.toEqual({value:"ok"})});
 it("409 오류 메시지를 보존한다",()=>expect(adminErrorMessage(new AdminApiError(409,"DRAFT_VERSION_ALREADY_EXISTS","이미 DRAFT가 있습니다."))).toBe("이미 DRAFT가 있습니다."));
 it("readiness 실패 항목을 서버 결과 그대로 표시한다",async()=>{vi.mocked(fetch).mockImplementationOnce(()=>response(detail)).mockImplementationOnce(()=>response(readiness));render(<ProgramVersionVerification versionId="v1"/>);expect(await screen.findByText("LATEST_TEST_PRESENT")).toBeInTheDocument();expect(screen.getByText("최근 테스트가 필요합니다.")).toBeInTheDocument()});
 it("새 DRAFT 409 충돌을 사용자에게 표시한다",async()=>{const program={id:"p1",slug:"test",category:"YOUTH_EMPLOYMENT",managingOrganization:"부산",operatingOrganization:null,archivedAt:null,currentPublishedVersionId:"v1",versions:[{id:"v1",versionNumber:1,title:"테스트",publicationStatus:"PUBLISHED",publishedAt:"2026-07-19",createdAt:"2026-07-19",updatedAt:"2026-07-19"}]};vi.mocked(fetch).mockImplementationOnce(()=>response(program)).mockImplementationOnce(()=>response({error:{code:"DRAFT_VERSION_ALREADY_EXISTS",message:"이미 편집 가능한 DRAFT 버전이 있습니다."}},409));render(<AdminProgramDetailView programId="p1"/>);const button=await screen.findByRole("button",{name:"새 DRAFT 생성"});fireEvent.click(button);expect(await screen.findByRole("alert")).toHaveTextContent("기존 DRAFT를 먼저 확인하세요")});
});
