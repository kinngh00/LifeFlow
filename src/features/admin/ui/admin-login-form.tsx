"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { adminApi, adminErrorMessage } from "./api-client";
import { fieldClass, primaryButton } from "./admin-ui";

const LoginFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("올바른 이메일을 입력해 주세요.")),
  password: z.string().min(12, "비밀번호는 12자 이상입니다.").max(128),
});

export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = LoginFormSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."); return; }
    setPending(true);
    try {
      await adminApi("/api/admin/auth/login", { method: "POST", body: JSON.stringify(parsed.data) });
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(adminErrorMessage(caught));
    } finally { setPending(false); }
  }

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-7 shadow-sm sm:p-9" aria-labelledby="login-heading">
      <h2 id="login-heading" className="text-xl font-bold">관리자 계정</h2>
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-email">이메일</label>
        <input autoComplete="username" className={fieldClass} id="admin-email" name="email" placeholder="admin@example.com" required type="email" />
        <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-password">비밀번호</label>
        <input autoComplete="current-password" className={fieldClass} id="admin-password" name="password" required type="password" />
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
        <button className={`${primaryButton} w-full`} disabled={pending} type="submit">{pending ? "로그인 중" : "로그인"}</button>
      </form>
    </section>
  );
}
