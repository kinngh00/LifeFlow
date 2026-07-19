import Link from "next/link";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const style = status === "PUBLISHED"
    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
    : status === "DRAFT"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-zinc-300 bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}>{status}</span>;
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold text-brand">LifeFlow 운영</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";
export const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-emerald-100";

export function BackLink({ href, children = "돌아가기" }: { href: string; children?: ReactNode }) {
  return <Link href={href} className="text-sm font-bold text-brand hover:underline">← {children}</Link>;
}
