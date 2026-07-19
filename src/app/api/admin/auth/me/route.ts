import { requireAdminSession } from "@/server/auth/admin-request";
import { toErrorResponse } from "@/server/errors/error-response";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireAdminSession(request);
    return Response.json({ admin: session.admin, expiresAt: session.expiresAt });
  } catch (error) {
    return toErrorResponse(error);
  }
}
