import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateAdminSession } from "@/features/admin/auth/services/admin-auth.service";
import { LogoutButton } from "@/features/admin/ui/logout-button";
import { ADMIN_SESSION_COOKIE_NAME } from "@/server/cookies/admin-session-cookie";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  let session: Awaited<ReturnType<typeof validateAdminSession>> | null = null;
  try { session = token ? await validateAdminSession(token) : null; } catch { session = null; }
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="text-lg font-black text-brand">LifeFlow Admin</Link>
            <nav aria-label="관리자 메뉴" className="flex gap-3 text-sm font-bold">
              <Link href="/admin">대시보드</Link>
              <Link href="/admin/programs">지원제도</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{session.admin.displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
