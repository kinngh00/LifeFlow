import { UpdateDraftProgramConfigurationBodySchema } from "@/features/admin/programs/schemas/admin-program-api.schema";
import { updateDraftProgramConfiguration } from "@/features/admin/programs/services/update-draft-program-configuration";
import { requireAdminSession } from "@/server/auth/admin-request";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseJsonRequest } from "@/server/http/parse-json";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    const session = await requireAdminSession(request);
    const body = await parseJsonRequest(request, UpdateDraftProgramConfigurationBodySchema);
    const { id } = await context.params;
    return Response.json(
      await updateDraftProgramConfiguration({
        ...body,
        programVersionId: id,
        updatedById: session.admin.id,
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
