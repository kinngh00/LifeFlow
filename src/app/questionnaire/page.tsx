import { PageShell } from "@/components/ui/page-shell";
import { QuestionnaireForm } from "@/features/questionnaire/ui/questionnaire-form";

export const metadata = { title: "조건 입력" };

export default function QuestionnairePage() {
  return (
    <PageShell
      eyebrow="비회원 조건 입력"
      title="나에게 필요한 지원 분야를 알려주세요"
      description="이름이나 연락처 없이 필요한 조건만 입력하면 공개된 지원제도를 규칙으로 점검합니다."
    >
      <QuestionnaireForm />
    </PageShell>
  );
}
