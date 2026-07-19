import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { validateAdminSession } from "@/features/admin/auth/services/admin-auth.service";
import { AdminLoginForm } from "@/features/admin/ui/admin-login-form";
import { ADMIN_SESSION_COOKIE_NAME } from "@/server/cookies/admin-session-cookie";

export const metadata = { title: "관리자 로그인" };

export default async function AdminLoginPage() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  let authenticated = false;
  if (token) {
    try { await validateAdminSession(token); authenticated = true; } catch { /* 로그인 폼 표시 */ }
  }
  if (authenticated) redirect("/admin");
  return (
    <PageShell eyebrow="LifeFlow 관리자" title="관리자 로그인" description="등록된 단일 ADMIN 계정으로 로그인하세요.">
      <AdminLoginForm />
    </PageShell>
  );
}
