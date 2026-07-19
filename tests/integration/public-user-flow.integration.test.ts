import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getSession, PUT as putSession, DELETE as deleteSession } from "@/app/api/questionnaire/session/route";
import { POST as evaluateRecommendations } from "@/app/api/recommendations/evaluate/route";
import { GET as getBenefitDetail } from "@/app/api/benefits/[slug]/route";
import { disconnectTestDatabase, getTestDatabase } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database = getTestDatabase();
const origin = "http://localhost:3000";
let scope: IntegrationTestScope;
let adminId: string;
let eligibleSlug: string;
let draftSlug: string;
let unpublishedSlug: string;
let archivedSlug: string;

const profile = {
  birthDate: "2000-01-01",
  residenceCityCode: "26000",
  residenceDistrictCode: null,
  interestedCategories: ["YOUTH_EMPLOYMENT"],
  employmentStatus: "UNEMPLOYED",
  jobSeekingStatus: "YES",
  studentStatus: "GRADUATED",
  householdSize: 1,
  incomeBand: "100% 이하",
  housingType: "MONTHLY_RENT",
  homeOwnershipStatus: "NO_HOME",
  householdHeadStatus: "HEAD",
};

function jsonRequest(path: string, method: string, body: unknown, cookie?: string) {
  return new Request(`${origin}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function getRequest(path: string, cookie?: string) {
  return new Request(`${origin}${path}`, { headers: cookie ? { cookie } : undefined });
}
function cookieFrom(response: Response) {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie) throw new Error("사용자 세션 쿠키가 없습니다.");
  return cookie;
}

async function createProgram(input: {
  status: "PUBLISHED" | "DRAFT" | "UNPUBLISHED";
  ruleType?: "AGE" | "MANUAL_REVIEW";
  expectedCondition?: object;
  archived?: boolean;
  category?: "YOUTH_EMPLOYMENT" | "YOUTH_HOUSING";
}) {
  const { program, version } = await scope.createProgramWithVersion(adminId, input.status);
  await database.supportProgram.update({
    where: { id: program.id },
    data: {
      category: input.category ?? "YOUTH_EMPLOYMENT",
      currentPublishedVersionId: version.id,
      archivedAt: input.archived ? new Date() : null,
    },
  });
  const source = await database.programSource.create({
    data: {
      programVersionId: version.id,
      sourceType: "OFFICIAL_PAGE",
      organizationName: "부산광역시 E2E 기관",
      documentTitle: "공식 테스트 안내",
      sourceUrl: `https://www.busan.go.kr/${program.slug}`,
      checkedAt: new Date("2026-07-19T00:00:00Z"),
      isPrimary: true,
    },
  });
  await database.programRegion.create({ data: { programVersionId: version.id, cityCode: "26000", districtCode: "ALL", coverageType: "CITY_WIDE" } });
  await database.eligibilityRule.create({
    data: {
      programVersionId: version.id,
      ruleType: input.ruleType ?? "AGE",
      displayOrder: 1,
      label: "공개 판정 규칙",
      description: input.ruleType === "MANUAL_REVIEW" ? "기관 확인이 필요한 조건" : "만 19세 이상 34세 이하",
      expectedCondition: input.expectedCondition ?? { minimumAge: 19, maximumAge: 34, referenceDate: "APPLICATION_DATE" },
      required: true,
      reviewRequired: input.ruleType === "MANUAL_REVIEW",
      missingValueBehavior: "UNKNOWN",
      passMessage: "조건을 충족합니다.",
      failureMessage: "조건을 충족하지 않습니다.",
      unknownMessage: "공식 기관 확인이 필요합니다.",
      sourceId: source.id,
      sourceLocation: "지원 대상",
      active: true,
    },
  });
  return { program, version };
}

async function saveProfile(value: object = profile) {
  return putSession(jsonRequest("/api/questionnaire/session", "PUT", value));
}

beforeAll(async () => {
  process.env.APP_ORIGIN = origin;
  process.env.USER_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});
beforeEach(async () => {
  scope = new IntegrationTestScope(database);
  adminId = (await scope.createAdmin()).id;
  eligibleSlug = (await createProgram({ status: "PUBLISHED" })).program.slug;
  await createProgram({ status: "PUBLISHED", ruleType: "MANUAL_REVIEW", expectedCondition: { reviewPrompt: "공식 기관 확인 필요" }, category: "YOUTH_HOUSING" });
  await createProgram({ status: "PUBLISHED", expectedCondition: { minimumAge: 50, referenceDate: "APPLICATION_DATE" } });
  await createProgram({ status: "PUBLISHED", expectedCondition: {} });
  draftSlug = (await createProgram({ status: "DRAFT" })).program.slug;
  unpublishedSlug = (await createProgram({ status: "UNPUBLISHED" })).program.slug;
  archivedSlug = (await createProgram({ status: "PUBLISHED", archived: true })).program.slug;
});
afterEach(async () => scope.cleanup());
afterAll(async () => disconnectTestDatabase());

describe("NATIONAL public flow", () => {
  it("returns no residence restriction in recommendation and detail", async () => {
    const program = await database.supportProgram.findUniqueOrThrow({ where: { slug: eligibleSlug } });
    await database.programRegion.updateMany({
      where: { programVersionId: program.currentPublishedVersionId! },
      data: { coverageType: "NATIONAL", cityCode: null, districtCode: null },
    });
    const cookie = cookieFrom(await saveProfile({ ...profile, residenceCityCode: "11000" }));
    const recommendation = await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate", "POST", {}, cookie))).json();
    const item = recommendation.data.items.find(({ slug }: { slug: string }) => slug === eligibleSlug);
    expect(item).toMatchObject({ eligibilityStatus: "ELIGIBLE", residenceRestriction: "부산 거주 필수 아님" });
    const response = await getBenefitDetail(getRequest(`/api/benefits/${eligibleSlug}`, cookie), { params: Promise.resolve({ slug: eligibleSlug }) });
    expect((await response.json()).data.residenceRestriction).toBe("부산 거주 필수 아님");
  });
});

describe("사용자 세션 API", () => {
  it("빈 세션은 빈 프로필을 반환한다", async () => expect(await (await getSession(getRequest("/api/questionnaire/session"))).json()).toMatchObject({ data: { hasSession: false, profile: {} } }));
  it("조건을 HttpOnly 쿠키에 저장한다", async () => { const response = await saveProfile(); expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toContain("HttpOnly"); });
  it("저장한 조건을 복원한다", async () => { const cookie = cookieFrom(await saveProfile()); const body = await (await getSession(getRequest("/api/questionnaire/session", cookie))).json(); expect(body.data.profile.birthDate).toBe("2000-01-01"); });
  it("일부 조건을 수정한다", async () => { const cookie = cookieFrom(await saveProfile()); const updated = await putSession(jsonRequest("/api/questionnaire/session", "PUT", { incomeBand: "50% 이하" }, cookie)); const restored = await (await getSession(getRequest("/api/questionnaire/session", cookieFrom(updated)))).json(); expect(restored.data.profile.incomeBand).toBe("50% 이하"); });
  it("초기화 쿠키를 설정한다", async () => { const response = await deleteSession(jsonRequest("/api/questionnaire/session", "DELETE", {})); expect(response.headers.get("set-cookie")).toContain("Max-Age=0"); });
  it("변조 쿠키는 빈 세션으로 처리한다", async () => { const cookie = `${cookieFrom(await saveProfile())}tampered`; const body = await (await getSession(getRequest("/api/questionnaire/session", cookie))).json(); expect(body.data.hasSession).toBe(false); });
  it("세션 저장 전후 DB 행 수가 변하지 않는다", async () => { const before = await database.supportProgram.count(); await saveProfile(); expect(await database.supportProgram.count()).toBe(before); });
  it("잘못된 Origin을 차단한다", async () => { const request = new Request(`${origin}/api/questionnaire/session`, { method:"PUT", headers:{"content-type":"application/json",origin:"https://evil.example"}, body:"{}" }); expect((await putSession(request)).status).toBe(403); });
});

describe("추천과 공개 상세 API", () => {
  it("게시된 제도를 네 상태로 판정하고 요약한다", async () => { const cookie=cookieFrom(await saveProfile()); const response=await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie)); const body=await response.json(); expect(response.status).toBe(200); expect(body.data.summary).toEqual({eligible:1,needsReview:1,notEligible:1,undetermined:1}); });
  it("DRAFT를 추천에서 제외한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie))).json(); expect(body.data.items.some((item:{slug:string})=>item.slug===draftSlug)).toBe(false); });
  it("UNPUBLISHED를 추천에서 제외한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie))).json(); expect(body.data.items.some((item:{slug:string})=>item.slug===unpublishedSlug)).toBe(false); });
  it("archived 프로그램을 추천에서 제외한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie))).json(); expect(body.data.items.some((item:{slug:string})=>item.slug===archivedSlug)).toBe(false); });
  it("상태 우선순위로 정렬한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie))).json(); expect(body.data.items.map((item:{eligibilityStatus:string})=>item.eligibilityStatus)).toEqual(["ELIGIBLE","NEEDS_REVIEW","NOT_ELIGIBLE","UNDETERMINED"]); });
  it("상태 필터를 적용한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{filters:{status:"NOT_ELIGIBLE"}},cookie))).json(); expect(body.data.items).toHaveLength(1); });
  it("카테고리 필터를 적용한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{filters:{category:"YOUTH_HOUSING"}},cookie))).json(); expect(body.data.items.every((item:{category:string})=>item.category==="YOUTH_HOUSING")).toBe(true); });
  it("페이지네이션을 적용한다", async () => { const cookie=cookieFrom(await saveProfile()); const body=await (await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{filters:{page:1,pageSize:2}},cookie))).json(); expect(body.data.items).toHaveLength(2); expect(body.data.pagination.totalItems).toBe(4); });
  it("추천 결과를 DB에 저장하지 않는다", async () => { const cookie=cookieFrom(await saveProfile()); const before=await database.ruleTestRun.count(); await evaluateRecommendations(jsonRequest("/api/recommendations/evaluate","POST",{},cookie)); expect(await database.ruleTestRun.count()).toBe(before); });
  it("공개 상세와 공식 출처를 반환한다", async () => { const response=await getBenefitDetail(getRequest(`/api/benefits/${eligibleSlug}`),{params:Promise.resolve({slug:eligibleSlug})}); const text=await response.text(); expect(response.status).toBe(200); expect(text).toContain("공식 테스트 안내"); expect(text).not.toContain("createdById"); expect(text).not.toContain("configurationHash"); });
  it("세션이 있으면 상세 판정 근거를 반환한다", async () => { const cookie=cookieFrom(await saveProfile()); const response=await getBenefitDetail(getRequest(`/api/benefits/${eligibleSlug}`,cookie),{params:Promise.resolve({slug:eligibleSlug})}); const body=await response.json(); expect(body.data.eligibility.status).toBe("ELIGIBLE"); expect(body.data.eligibility.ruleResults[0]).not.toHaveProperty("expectedValue"); });
  it("세션이 없으면 공식 정보만 반환한다", async () => { const response=await getBenefitDetail(getRequest(`/api/benefits/${eligibleSlug}`),{params:Promise.resolve({slug:eligibleSlug})}); expect((await response.json()).data.eligibility).toBeNull(); });
  it("잘못된 slug는 404", async () => expect((await getBenefitDetail(getRequest("/api/benefits/not-found"),{params:Promise.resolve({slug:"not-found"})})).status).toBe(404));
  it("DRAFT 상세는 404", async () => expect((await getBenefitDetail(getRequest(`/api/benefits/${draftSlug}`),{params:Promise.resolve({slug:draftSlug})})).status).toBe(404));
  it("UNPUBLISHED 상세는 404", async () => expect((await getBenefitDetail(getRequest(`/api/benefits/${unpublishedSlug}`),{params:Promise.resolve({slug:unpublishedSlug})})).status).toBe(404));
  it("조건 변경 후 판정 결과가 바뀐다", async () => { const first=cookieFrom(await saveProfile()); const updated=cookieFrom(await putSession(jsonRequest("/api/questionnaire/session","PUT",{birthDate:"1960-01-01"},first))); const body=await (await getBenefitDetail(getRequest(`/api/benefits/${eligibleSlug}`,updated),{params:Promise.resolve({slug:eligibleSlug})})).json(); expect(body.data.eligibility.status).toBe("NOT_ELIGIBLE"); });
});
