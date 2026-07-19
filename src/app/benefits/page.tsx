import { PageShell } from "@/components/ui/page-shell";
import { BenefitResults } from "@/features/benefits/ui/benefit-results";

export const metadata = { title: "지원제도" };
export const dynamic = "force-dynamic";

export default function BenefitsPage() {
  return (
    <PageShell eyebrow="맞춤 결과" title="내 조건으로 확인한 지원제도" description="관리자가 검수·게시한 공식 정보와 코드 기반 자격 규칙만 사용합니다.">
      <BenefitResults />
    </PageShell>
  );
}
