import { RunProgramVersionTestsBodySchema } from "@/features/admin/programs/schemas/admin-program-api.schema";
import { runProgramVersionTests } from "@/features/admin/programs/services/run-program-version-tests";
import { requireAdminSession } from "@/server/auth/admin-request";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    const session = await requireAdminSession(request);
    await parseJsonRequest(request, RunProgramVersionTestsBodySchema);
    const { id } = await context.params;
    return Response.json(
      await runProgramVersionTests({ programVersionId: id, executedById: session.admin.id }),
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
