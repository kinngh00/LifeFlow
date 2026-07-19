import Link from "next/link";

const principles = [
  {
    title: "공식 출처 중심",
    description: "게시 기관의 공고와 안내 페이지를 기준으로 정보를 제공합니다.",
  },
  {
    title: "조건별 근거",
    description: "추천 결과와 함께 PASS, FAIL, UNKNOWN 판단 근거를 보여줍니다.",
  },
  {
    title: "비회원 이용",
    description: "입력한 조건은 세션에서만 사용하며 데이터베이스에 저장하지 않습니다.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[600px] max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-brand/20 bg-emerald-50 px-4 py-2 text-sm font-semibold text-brand">
            부산 청년 취업·주거 지원제도
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-[-0.04em] text-foreground sm:text-6xl">
            내 상황에 맞는 지원을
            <span className="block text-brand">근거와 함께 찾으세요.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
            LifeFlow는 공식 조건을 바탕으로 부산광역시 청년 취업·주거 지원제도를 찾아보는 서비스입니다. 현재는 서비스 기반을 준비하고 있습니다.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-xl bg-brand px-6 py-3.5 text-center font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2" href="/questionnaire">
              조건 입력 화면 보기
            </Link>
            <Link className="rounded-xl border border-line bg-white px-6 py-3.5 text-center font-semibold text-foreground transition hover:border-brand/30 hover:bg-emerald-50" href="/admin/login">
              관리자 화면 보기
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_70px_rgba(23,107,77,0.10)] sm:p-8">
          <div className="flex items-center justify-between border-b border-line pb-5">
            <div>
              <p className="text-sm font-semibold text-brand">MVP 준비 상태</p>
              <p className="mt-1 text-2xl font-bold">서비스 골격 구성</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">초기 단계</span>
          </div>
          <div className="mt-6 space-y-4">
            {principles.map((principle, index) => (
              <div className="flex gap-4 rounded-2xl bg-background p-4" key={principle.title}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{index + 1}</span>
                <div>
                  <h2 className="font-bold">{principle.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{principle.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
