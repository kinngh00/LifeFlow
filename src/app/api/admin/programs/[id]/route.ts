import { getAdminProgramDetail } from "@/features/admin/programs/services/get-admin-program-detail";
import { requireAdminSession } from "@/server/auth/admin-request";
import { toErrorResponse } from "@/server/errors/error-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    return Response.json(await getAdminProgramDetail(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
