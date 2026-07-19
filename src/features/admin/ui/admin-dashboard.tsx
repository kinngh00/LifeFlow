"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminProgramListResult } from "@/features/admin/programs/types/admin-program.types";
import { adminApi, adminErrorMessage } from "./api-client";
import { AdminPageHeader, Panel, StatusBadge, primaryButton } from "./admin-ui";

export function AdminDashboard() {
  const [data, setData] = useState<AdminProgramListResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminApi<AdminProgramListResult>("/api/admin/programs?pageSize=100").then(setData).catch((e) => setError(adminErrorMessage(e))); }, []);
  const counts = { DRAFT: 0, PUBLISHED: 0, UNPUBLISHED: 0 };
  for (const item of data?.items ?? []) {
    const status = item.latestVersion?.publicationStatus;
    if (status === "DRAFT" || status === "PUBLISHED" || status === "UNPUBLISHED") counts[status] += 1;
  }
  return (
    <div className="space-y-7">
      <AdminPageHeader title="대시보드" description="지원제도 등록부터 검증·게시까지 운영 상태를 확인합니다." action={<Link className={primaryButton} href="/admin/programs/new">새 지원제도</Link>} />
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['전체', data?.total ?? '—'], ['DRAFT', counts.DRAFT], ['PUBLISHED', counts.PUBLISHED], ['UNPUBLISHED', counts.UNPUBLISHED]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-5"><p className="text-sm font-bold text-muted">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>
        ))}
      </div>
      <Panel title="최근 수정 지원제도">
        {!data ? <p className="text-muted">불러오는 중입니다.</p> : data.items.length === 0 ? <p className="text-muted">등록된 지원제도가 없습니다.</p> : (
          <ul className="divide-y divide-line">
            {data.items.slice(0, 5).map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link href={`/admin/programs/${item.id}`} className="font-bold hover:text-brand">{item.latestVersion?.title ?? item.slug}</Link><p className="text-xs text-muted">{item.managingOrganization}</p></div>{item.latestVersion ? <StatusBadge status={item.latestVersion.publicationStatus} /> : null}</li>)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
