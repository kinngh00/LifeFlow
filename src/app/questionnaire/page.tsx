import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "조건 입력" };

export default function QuestionnairePage() {
  return (
    <PageShell
      eyebrow="비회원 조건 입력"
      title="나에게 필요한 지원 분야를 알려주세요"
      description="현재는 화면 구조만 확인할 수 있습니다. 입력 저장과 추천 판정은 다음 개발 단계에서 연결합니다."
    >
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8" aria-labelledby="questionnaire-heading">
        <div className="mb-8 flex items-center gap-3">
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">1 / 4</span>
          <h2 id="questionnaire-heading" className="font-bold">기본 조건</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            거주 지역
            <select className="h-12 rounded-xl border border-line bg-white px-4 text-muted" defaultValue="busan" disabled>
              <option value="busan">부산광역시</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            연령대
            <select className="h-12 rounded-xl border border-line bg-white px-4 text-muted" defaultValue="" disabled>
              <option value="">선택 예정</option>
            </select>
          </label>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-semibold">관심 있는 지원 분야</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand/30 bg-emerald-50 p-5">
              <p className="font-bold text-brand">청년 취업 지원</p>
              <p className="mt-1 text-sm text-muted">취업 준비, 교육, 일자리 지원</p>
            </div>
            <div className="rounded-2xl border border-brand/30 bg-emerald-50 p-5">
              <p className="font-bold text-brand">청년 주거 지원</p>
              <p className="mt-1 text-sm text-muted">월세, 임차, 주거 안정 지원</p>
            </div>
          </div>
        </fieldset>

        <div className="mt-9 flex items-center justify-between border-t border-line pt-6">
          <p className="text-sm text-muted">사용자 데이터는 아직 수집하지 않습니다.</p>
          <button className="cursor-not-allowed rounded-xl bg-zinc-200 px-5 py-3 font-semibold text-zinc-500" disabled type="button">다음 단계</button>
        </div>
      </section>
    </PageShell>
  );
}
