"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminProgramDetail } from "@/features/admin/programs/types/admin-program-detail.types";
import type { CreateDraftVersionResult } from "@/features/admin/programs/types/program-publication.types";
import { AdminApiError,adminApi,adminErrorMessage } from "./api-client";
import { AdminPageHeader,BackLink,Panel,StatusBadge,fieldClass,primaryButton,secondaryButton } from "./admin-ui";

export function AdminProgramDetailView({programId}:{programId:string}){
 const router=useRouter();const [data,setData]=useState<AdminProgramDetail|null>(null);const [error,setError]=useState("");const [pending,setPending]=useState(false);const [sourceVersionId,setSourceVersionId]=useState("");
 useEffect(()=>{adminApi<AdminProgramDetail>(`/api/admin/programs/${programId}`).then(setData).catch(e=>setError(adminErrorMessage(e)))},[programId]);
 async function createDraft(){if(pending||!window.confirm("선택한 게시 이력에서 새 DRAFT를 생성할까요? 현재 공개 버전은 변경되지 않습니다."))return;setPending(true);setError("");try{const result=await adminApi<CreateDraftVersionResult>(`/api/admin/programs/${programId}/draft-versions`,{method:"POST",body:JSON.stringify(sourceVersionId?{sourceVersionId}:{})});router.push(`/admin/program-versions/${result.draftVersion.id}/edit`)}catch(e){setError(e instanceof AdminApiError&&e.status===409?`${adminErrorMessage(e)} 기존 DRAFT를 먼저 확인하세요.`:adminErrorMessage(e))}finally{setPending(false)}}
 if(error&&!data)return <div className="space-y-5"><BackLink href="/admin/programs"/><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p></div>;
 if(!data)return <p>상세 정보를 불러오는 중입니다.</p>;
 const sources=data.versions.filter(v=>v.publicationStatus==="PUBLISHED"||v.publicationStatus==="UNPUBLISHED");
 return <div className="space-y-7"><BackLink href="/admin/programs"/><AdminPageHeader title={data.versions[0]?.title??data.slug} description={`${data.slug} · ${data.managingOrganization}`}/>{error?<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>:null}
 <div className="grid gap-5 lg:grid-cols-[2fr_1fr]"><Panel title="버전 이력"><div className="space-y-3">{data.versions.map(v=><article key={v.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">v{v.versionNumber} · {v.title}</p><p className="text-xs text-muted">수정 {new Date(v.updatedAt).toLocaleString("ko-KR")}</p></div><StatusBadge status={v.publicationStatus}/></div><div className="mt-3 flex flex-wrap gap-2"><Link className={secondaryButton} href={`/admin/program-versions/${v.id}/tests`}>검증·게시</Link>{v.publicationStatus==="DRAFT"?<Link className={primaryButton} href={`/admin/program-versions/${v.id}/edit`}>DRAFT 편집</Link>:null}{data.currentPublishedVersionId===v.id?<span className="self-center text-xs font-bold text-emerald-700">현재 공개 버전</span>:null}</div></article>)}</div></Panel>
 <Panel title="새 DRAFT"><p className="text-sm leading-6 text-muted">게시 이력을 복제해 다음 버전을 만듭니다. 기존 공개 포인터는 유지됩니다.</p><label className="mt-4 grid gap-2 text-sm font-bold">복제 기준<select className={fieldClass} value={sourceVersionId} onChange={e=>setSourceVersionId(e.target.value)}><option value="">현재 공개 버전</option>{sources.map(v=><option key={v.id} value={v.id}>v{v.versionNumber} · {v.publicationStatus}</option>)}</select></label><button className={`${primaryButton} mt-4 w-full`} disabled={pending||sources.length===0} onClick={createDraft}>{pending?"생성 중":"새 DRAFT 생성"}</button></Panel></div></div>;
}
