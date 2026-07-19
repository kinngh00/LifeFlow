import { NextResponse } from "next/server";
import { QuestionnaireSessionUpdateSchema } from "@/features/questionnaire/schemas/questionnaire-profile.schema";
import { assertSafePublicMutationRequest } from "@/server/csrf/validate-public-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";
import {
  clearQuestionnaireSession,
  readQuestionnaireSession,
  setQuestionnaireSession,
} from "@/server/questionnaire/questionnaire-session";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const profile = readQuestionnaireSession(request);
  return NextResponse.json(
    { data: { hasSession: Boolean(profile), profile: profile ?? {} } },
    { headers: noStoreHeaders },
  );
}
export async function PUT(request: Request) {
  try {
    assertSafePublicMutationRequest(request);
    const update = await parseJsonRequest(request, QuestionnaireSessionUpdateSchema);
    const current = readQuestionnaireSession(request) ?? {};
    const profile = QuestionnaireSessionUpdateSchema.parse({ ...current, ...update });
    const response = NextResponse.json(
      { data: { hasSession: true, profile } },
      { headers: noStoreHeaders },
    );
    setQuestionnaireSession(response, profile);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSafePublicMutationRequest(request);
    const response = NextResponse.json(
      { data: { hasSession: false, profile: {} } },
      { headers: noStoreHeaders },
    );
    clearQuestionnaireSession(response);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
