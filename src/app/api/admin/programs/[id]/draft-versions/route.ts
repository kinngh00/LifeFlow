import { CreateDraftVersionBodySchema } from "@/features/admin/programs/schemas/admin-program-api.schema";
import { createDraftVersionFromPublished } from "@/features/admin/programs/services/create-draft-version-from-published";
import { requireAdminSession } from "@/server/auth/admin-request";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    const session = await requireAdminSession(request);
    const body = await parseJsonRequest(request, CreateDraftVersionBodySchema);
    const { id } = await context.params;
    return Response.json(
      await createDraftVersionFromPublished({
        programId: id,
        createdById: session.admin.id,
        ...(body.sourceVersionId ? { sourceVersionId: body.sourceVersionId } : {}),
      }),
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
