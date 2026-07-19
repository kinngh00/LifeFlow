import { NextResponse } from "next/server";
import { getPublishedBenefitDetail } from "@/features/benefits/services/published-benefits.service";
import { QuestionnaireProfileSchema } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import { toErrorResponse } from "@/server/errors/error-response";
import { readQuestionnaireSession } from "@/server/questionnaire/questionnaire-session";
import { getSeoulDate } from "@/server/time/seoul-date";

type BenefitRouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  request: Request,
  context: BenefitRouteContext,
) {
  try {
    const { slug } = await context.params;
    const profile = QuestionnaireProfileSchema.safeParse(
      readQuestionnaireSession(request),
    );
    const result = await getPublishedBenefitDetail({
      slug,
      profile: profile.success ? profile.data : null,
      evaluationDate: getSeoulDate(),
    });
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
