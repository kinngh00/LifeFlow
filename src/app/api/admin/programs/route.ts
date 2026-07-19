import { createProgramWithInitialVersion } from "@/features/admin/programs/services/create-program-with-initial-version";
import { listAdminPrograms } from "@/features/admin/programs/services/list-admin-programs";
import { AdminProgramListQuerySchema } from "@/features/admin/programs/schemas/admin-program-list.schema";
import { CreateAdminProgramBodySchema } from "@/features/admin/programs/schemas/admin-program-api.schema";
import { requireAdminSession } from "@/server/auth/admin-request";
import { assertSafeAdminMutationRequest } from "@/server/csrf/validate-admin-origin";
import { toErrorResponse } from "@/server/errors/error-response";
import { parseOrThrow } from "@/server/errors/validation-error";
import { parseJsonRequest } from "@/server/http/parse-json";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdminSession(request);
    const params = new URL(request.url).searchParams;
    const rawQuery = {
      category: params.get("category") ?? undefined,
      publicationStatus: params.get("publicationStatus") ?? undefined,
      includeArchived: params.has("includeArchived")
        ? params.get("includeArchived") === "true"
          ? true
          : params.get("includeArchived") === "false"
            ? false
            : params.get("includeArchived")
        : undefined,
      search: params.get("search") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    };
    return Response.json(await listAdminPrograms(parseOrThrow(AdminProgramListQuerySchema, rawQuery)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertSafeAdminMutationRequest(request);
    const session = await requireAdminSession(request);
    const body = await parseJsonRequest(request, CreateAdminProgramBodySchema);
    const result = await createProgramWithInitialVersion({ ...body, createdById: session.admin.id });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
