"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminProgramListResult } from "@/features/admin/programs/types/admin-program.types";
import { adminApi, adminErrorMessage } from "./api-client";
import { AdminPageHeader, StatusBadge, fieldClass, primaryButton, secondaryButton } from "./admin-ui";

export function buildProgramListQuery(values: Record<string, string | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "" && value !== false) params.set(key, String(value));
  return params.toString();
}

export function AdminProgramList() {
  const searchParams = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const query = searchParams.toString();
  const [data, setData] = useState<AdminProgramListResult | null>(null); const [error, setError] = useState("");
  useEffect(() => { adminApi<AdminProgramListResult>(`/api/admin/programs${query ? `?${query}` : ""}`).then(setData).catch((e) => setError(adminErrorMessage(e))); }, [query]);
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = buildProgramListQuery({ search: String(form.get("search") ?? ""), category: String(form.get("category") ?? ""), publicationStatus: String(form.get("publicationStatus") ?? ""), includeArchived: form.get("includeArchived") === "on" ? true : undefined }); router.push(`${pathname}${next ? `?${next}` : ""}`); }
  return <div className="space-y-7">
    <AdminPageHeader title="지원제도" description="검색과 상태 필터로 등록된 지원제도 버전을 관리합니다." action={<Link href="/admin/programs/new" className={primaryButton}>새 지원제도</Link>} />
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-[2fr_1fr_1fr_auto_auto]">
      <input aria-label="검색" className={fieldClass} defaultValue={searchParams.get("search") ?? ""} name="search" placeholder="slug, 제목, 기관 검색" />
      <select aria-label="분야" className={fieldClass} defaultValue={searchParams.get("category") ?? ""} name="category"><option value="">전체 분야</option><option value="YOUTH_EMPLOYMENT">청년 취업</option><option value="YOUTH_HOUSING">청년 주거</option></select>
      <select aria-label="게시 상태" className={fieldClass} defaultValue={searchParams.get("publicationStatus") ?? ""} name="publicationStatus"><option value="">전체 상태</option>{["DRAFT","PUBLISHED","UNPUBLISHED","ARCHIVED"].map((v)=><option key={v}>{v}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={searchParams.get("includeArchived") === "true"} name="includeArchived" type="checkbox" /> 보관 포함</label>
      <button className={secondaryButton}>적용</button>
    </form>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : !data ? <p className="text-muted">불러오는 중입니다.</p> : data.items.length === 0 ? <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">조건에 맞는 지원제도가 없습니다.</div> : <div className="grid gap-4">
      {data.items.map((item)=><article key={item.id} className="rounded-2xl border border-line bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-muted">{item.slug}</p><Link className="text-lg font-black hover:text-brand" href={`/admin/programs/${item.id}`}>{item.latestVersion?.title ?? "제목 없음"}</Link><p className="mt-1 text-sm text-muted">{item.managingOrganization} · 버전 {item.versionCount}개</p></div><div className="flex items-start gap-2">{item.latestVersion ? <StatusBadge status={item.latestVersion.publicationStatus} /> : null}{item.currentPublishedVersion ? <span className="text-xs font-bold text-emerald-700">현재 공개 v{item.currentPublishedVersion.versionNumber}</span> : null}</div></div><p className="mt-3 text-xs text-muted">수정 {new Date(item.updatedAt).toLocaleString("ko-KR")}</p></article>)}
    </div>}
    {data && data.totalPages > 1 ? <div className="flex justify-center gap-3"><button className={secondaryButton} disabled={data.page<=1} onClick={()=>{const p=new URLSearchParams(query);p.set("page",String(data.page-1));router.push(`${pathname}?${p}`)}}>이전</button><span className="py-3 text-sm">{data.page} / {data.totalPages}</span><button className={secondaryButton} disabled={data.page>=data.totalPages} onClick={()=>{const p=new URLSearchParams(query);p.set("page",String(data.page+1));router.push(`${pathname}?${p}`)}}>다음</button></div> : null}
  </div>;
}
