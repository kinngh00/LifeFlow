import { PageShell } from "@/components/ui/page-shell";

export const metadata = { title: "지원제도" };

export default function BenefitsPage() {
  return (
    <PageShell eyebrow="지원제도" title="게시된 지원제도가 없습니다" description="실제 지원제도 CRUD와 공개 목록은 다음 단계의 데이터 모델 및 관리자 기능 이후 연결합니다.">
      <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center text-muted">더미 지원제도는 표시하지 않습니다.</div>
    </PageShell>
  );
}
