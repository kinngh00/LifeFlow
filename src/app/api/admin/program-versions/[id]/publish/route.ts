import { PublishProgramVersionBodySchema } from "@/features/admin/programs/schemas/admin-program-api.schema";
import { publishProgramVersion } from "@/features/admin/programs/services/publish-program-version";
import { requireAdminSession } from "@/server/auth/admin-request";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    const session = await requireAdminSession(request);
    const body = await parseJsonRequest(request, PublishProgramVersionBodySchema);
    const { id } = await context.params;
    return Response.json(
      await publishProgramVersion({
        programVersionId: id,
        publishedById: session.admin.id,
        reason: body.reason,
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
