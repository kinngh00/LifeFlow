import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-9">
        <p className="text-sm font-bold text-brand">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">{description}</p>
      </header>
      {children}
    </main>
  );
}
