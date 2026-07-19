"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestionnaireProfileDraft } from "../schemas/questionnaire-profile.schema";

const steps = ["안내", "기본 조건", "취업", "학생", "소득", "주거", "관심 분야", "확인"];
const fieldClass = "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm";

async function sessionRequest(method: "PUT" | "DELETE", body: object) {
  const response = await fetch("/api/questionnaire/session", {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("조건을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export function QuestionnaireForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<QuestionnaireProfileDraft>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/questionnaire/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProfile(payload.data?.profile ?? {}))
      .catch(() => setError("저장된 조건을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof QuestionnaireProfileDraft>(key: K, value: QuestionnaireProfileDraft[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function validateCurrent(): string {
    if (step === 1 && (!profile.birthDate || !profile.residenceCityCode)) return "생년월일과 거주 지역을 선택해 주세요.";
    if (step === 2 && (!profile.employmentStatus || !profile.jobSeekingStatus)) return "취업 상태와 구직 여부를 선택해 주세요.";
    if (step === 3 && !profile.studentStatus) return "학생 상태를 선택해 주세요.";
    if (step === 4 && (!profile.householdSize || !profile.incomeBand)) return "가구원 수와 소득 구간을 선택해 주세요.";
    if (step === 5 && (!profile.housingType || !profile.homeOwnershipStatus || !profile.householdHeadStatus)) return "주거 조건을 모두 선택해 주세요.";
    if (step === 6 && !profile.interestedCategories?.length) return "관심 분야를 하나 이상 선택해 주세요.";
    return "";
  }

  async function next() {
    const message = validateCurrent();
    if (message) return setError(message);
    setError("");
    setPending(true);
    try {
      if (step > 0) await sessionRequest("PUT", profile);
      setStep((current) => Math.min(current + 1, steps.length - 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "조건을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function evaluate() {
    setPending(true); setError("");
    try {
      await sessionRequest("PUT", profile);
      const response = await fetch("/api/recommendations/evaluate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("추천 결과를 계산하지 못했습니다.");
      router.push("/benefits");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "추천 실행에 실패했습니다.");
    } finally { setPending(false); }
  }

  async function reset() {
    if (!window.confirm("입력한 조건을 모두 초기화할까요?")) return;
    setPending(true);
    try {
      await sessionRequest("DELETE", {});
      setProfile({}); setStep(0); setError("");
    } catch { setError("조건을 초기화하지 못했습니다."); }
    finally { setPending(false); }
  }

  if (loading) return <div role="status" className="rounded-3xl border border-line bg-white p-8">저장된 조건을 불러오는 중입니다.</div>;

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8" aria-labelledby="questionnaire-heading">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-brand">{step + 1} / {steps.length}</p><h2 id="questionnaire-heading" className="text-xl font-bold">{steps[step]}</h2></div>
        <progress className="h-2 w-40 accent-emerald-700" max={steps.length} value={step + 1} aria-label="설문 진행률" />
      </div>
      {step === 0 && <div className="space-y-4"><p className="text-lg font-semibold">개인정보를 최소한으로 사용해 신청 가능성을 미리 확인합니다.</p><p className="text-sm text-muted">이름·연락처·정확한 주소는 받지 않으며, 입력 조건은 암호화된 브라우저 쿠키에만 최대 90분 보관됩니다. 결과는 행정기관의 최종 승인이 아닙니다.</p></div>}
      {step === 1 && <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 font-semibold">생년월일 또는 모름<select aria-label="생년월일 입력 방식" className={fieldClass} value={profile.birthDate === "UNKNOWN" ? "UNKNOWN" : "DATE"} onChange={(e)=>update("birthDate",e.target.value==="UNKNOWN"?"UNKNOWN":undefined)}><option value="DATE">날짜 입력</option><option value="UNKNOWN">모름</option></select>{profile.birthDate !== "UNKNOWN" && <input aria-label="생년월일" className={fieldClass} type="date" min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={profile.birthDate ?? ""} onChange={(e)=>update("birthDate",e.target.value)} />}</label><label className="grid gap-2 font-semibold">거주 지역<select className={fieldClass} value={profile.residenceCityCode ?? ""} onChange={(e)=>{update("residenceCityCode",e.target.value);if(e.target.value!=="26000")update("residenceDistrictCode",null)}}><option value="">선택</option><option value="26000">부산광역시</option><option value="11000">부산 외 지역</option><option value="UNKNOWN">모름</option></select><span className="text-xs font-normal text-muted">부산 외 지역도 입력할 수 있으며 지역 규칙에서 판정합니다.</span></label></div>}
      {step === 2 && <div className="grid gap-5 sm:grid-cols-2"><Select label="현재 취업 상태" value={profile.employmentStatus} onChange={(v)=>update("employmentStatus",v as QuestionnaireProfileDraft["employmentStatus"])} options={[['EMPLOYED','재직 중'],['UNEMPLOYED','미취업'],['SELF_EMPLOYED','자영업'],['FREELANCER','프리랜서'],['NOT_ECONOMICALLY_ACTIVE','비경제활동'],['UNKNOWN','모름']]} /><Select label="현재 구직 중인가요?" value={profile.jobSeekingStatus} onChange={(v)=>update("jobSeekingStatus",v as QuestionnaireProfileDraft["jobSeekingStatus"])} options={[['YES','예'],['NO','아니오'],['UNKNOWN','모름']]} /></div>}
      {step === 3 && <Select label="학생 상태" value={profile.studentStatus} onChange={(v)=>update("studentStatus",v as QuestionnaireProfileDraft["studentStatus"])} options={[['ENROLLED','재학'],['ON_LEAVE','휴학'],['EXPECTED_TO_GRADUATE','졸업 예정'],['GRADUATED','졸업'],['NOT_A_STUDENT','학생 아님'],['UNKNOWN','모름']]} />}
      {step === 4 && <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 font-semibold">가구원 수<select className={fieldClass} value={profile.householdSize ?? ""} onChange={(e)=>update("householdSize",e.target.value==="UNKNOWN"?"UNKNOWN":Number(e.target.value))}><option value="">선택</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}명{n===6?' 이상':''}</option>)}<option value="UNKNOWN">모름</option></select></label><Select label="기준 중위소득 구간" value={profile.incomeBand} onChange={(v)=>update("incomeBand",v)} options={[['50% 이하','50% 이하'],['100% 이하','100% 이하'],['120% 이하','120% 이하'],['150% 이하','150% 이하'],['150% 초과','150% 초과'],['UNKNOWN','모름']]} /></div>}
      {step === 5 && <div className="grid gap-5 sm:grid-cols-3"><Select label="주거 형태" value={profile.housingType} onChange={(v)=>update("housingType",v as QuestionnaireProfileDraft["housingType"])} options={[['OWNED','자가'],['JEONSE','전세'],['MONTHLY_RENT','월세'],['PUBLIC_RENTAL','공공임대'],['WITH_FAMILY','가족과 거주'],['DORMITORY','기숙사'],['OTHER','기타'],['UNKNOWN','모름']]} /><Select label="주택 소유" value={profile.homeOwnershipStatus} onChange={(v)=>update("homeOwnershipStatus",v as QuestionnaireProfileDraft["homeOwnershipStatus"])} options={[['NO_HOME','무주택'],['OWNS_HOME','주택 소유'],['UNKNOWN','모름']]} /><Select label="가구주 여부" value={profile.householdHeadStatus} onChange={(v)=>update("householdHeadStatus",v as QuestionnaireProfileDraft["householdHeadStatus"])} options={[['HEAD','가구주'],['MEMBER','가구원'],['UNKNOWN','모름']]} /></div>}
      {step === 6 && <fieldset><legend className="font-semibold">관심 분야를 선택해 주세요.</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['YOUTH_EMPLOYMENT','청년 취업 지원'],['YOUTH_HOUSING','청년 주거 지원']] as const).map(([value,label])=><label key={value} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white p-4"><input type="checkbox" checked={profile.interestedCategories?.includes(value)??false} onChange={(e)=>update("interestedCategories",e.target.checked?[...(profile.interestedCategories??[]),value]:(profile.interestedCategories??[]).filter(v=>v!==value))}/><span className="font-bold">{label}</span></label>)}</div></fieldset>}
      {step === 7 && <div><p className="mb-4 text-sm text-muted">입력값은 판정에 필요한 최소 조건입니다. “모름”은 탈락이 아니라 추가 확인 또는 판정 불가로 처리될 수 있습니다.</p><dl className="grid gap-3 rounded-2xl bg-white p-5 text-sm sm:grid-cols-2"><Summary label="생년월일" value={profile.birthDate}/><Summary label="거주지" value={profile.residenceCityCode}/><Summary label="취업 상태" value={profile.employmentStatus}/><Summary label="학생 상태" value={profile.studentStatus}/><Summary label="소득" value={profile.incomeBand}/><Summary label="주거" value={profile.housingType}/></dl></div>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><button type="button" onClick={reset} disabled={pending} className="text-sm font-semibold text-muted underline">전체 초기화</button><div className="flex gap-2">{step>0&&<button type="button" onClick={()=>{setError("");setStep(s=>s-1)}} className="rounded-xl border border-line px-5 py-3 font-semibold">이전</button>}{step<steps.length-1?<button type="button" onClick={next} disabled={pending} className="rounded-xl bg-brand px-5 py-3 font-bold text-white disabled:opacity-50">{pending?'저장 중…':'다음'}</button>:<button type="button" onClick={evaluate} disabled={pending} className="rounded-xl bg-brand px-5 py-3 font-bold text-white disabled:opacity-50">{pending?'판정 중…':'추천 결과 보기'}</button>}</div></div>
    </section>
  );
}

function Select({label,value,onChange,options}:{label:string;value:string|number|undefined;onChange:(value:string)=>void;options:readonly (readonly [string,string])[]}){return <label className="grid gap-2 font-semibold">{label}<select className={fieldClass} value={value??""} onChange={(e)=>onChange(e.target.value)}><option value="">선택</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><span className="text-xs font-normal text-muted">판정에 필요한 조건이며 모름을 선택할 수 있습니다.</span></label>}
function Summary({label,value}:{label:string;value:unknown}){return <div><dt className="font-semibold text-muted">{label}</dt><dd className="mt-1 font-bold">{String(value??'미입력')}</dd></div>}
