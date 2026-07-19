import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
        <Link className="text-xl font-extrabold tracking-[-0.04em] text-brand" href="/">
          LifeFlow
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-5 text-sm font-semibold text-muted">
          <Link className="transition hover:text-brand" href="/questionnaire">조건 입력</Link>
          <Link className="transition hover:text-brand" href="/admin/login">관리자</Link>
        </nav>
      </div>
    </header>
  );
}
