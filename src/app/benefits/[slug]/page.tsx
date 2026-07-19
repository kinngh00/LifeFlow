import { PageShell } from "@/components/ui/page-shell";
import { BenefitDetail } from "@/features/benefits/ui/benefit-detail";

export const metadata = { title: "지원제도 상세" };

export default async function BenefitDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageShell eyebrow="공식 지원제도" title="지원제도 상세" description="공식 정보와 내 조건 판정 근거를 구분해 확인하세요.">
      <BenefitDetail slug={slug} />
    </PageShell>
  );
}
