"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "./api-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="rounded-lg border border-line px-3 py-2 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try { await adminApi("/api/admin/auth/logout", { method: "POST", body: "{}" }); }
        finally { router.replace("/admin/login"); router.refresh(); }
      }}
      type="button"
    >
      {pending ? "로그아웃 중" : "로그아웃"}
    </button>
  );
}
