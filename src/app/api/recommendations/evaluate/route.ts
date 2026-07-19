import { NextResponse } from "next/server";
import { getPersonalizedBenefitRecommendations } from "@/features/benefits/services/published-benefits.service";
import { RecommendationRequestSchema } from "@/features/benefits/schemas/recommendation.schema";
import { QuestionnaireProfileSchema } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import { assertSafePublicMutationRequest } from "@/server/csrf/validate-public-origin";
import { AppError } from "@/server/errors/app-error";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";
import { readQuestionnaireSession } from "@/server/questionnaire/questionnaire-session";
import { getSeoulDate } from "@/server/time/seoul-date";

export async function POST(request: Request) {
  try {
    assertSafePublicMutationRequest(request);
    const profileResult = QuestionnaireProfileSchema.safeParse(
      readQuestionnaireSession(request),
    );
    if (!profileResult.success) {
      throw new AppError(
        "QUESTIONNAIRE_SESSION_REQUIRED",
        "추천을 받으려면 조건 입력을 먼저 완료해 주세요.",
        400,
      );
    }
    const body = await parseJsonRequest(request, RecommendationRequestSchema);
    const result = await getPersonalizedBenefitRecommendations({
      profile: profileResult.data,
      filters: body.filters,
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
