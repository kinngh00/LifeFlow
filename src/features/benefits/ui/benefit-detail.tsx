"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublishedBenefitDetail } from "../types/public-benefit.types";

export function BenefitDetail({ slug }: { slug: string }) {
  const [data, setData] = useState<PublishedBenefitDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/benefits/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 404 ? "공개 지원제도를 찾을 수 없습니다." : "상세 정보를 불러오지 못했습니다.");
        }
        return response.json();
      })
      .then((value) => setData(value.data))
      .catch((caught) => setError(caught.message));
  }, [slug]);

  if (error) return <div role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">{error}</div>;
  if (!data) return <p role="status" className="rounded-2xl border border-line bg-white p-8">공식 정보를 불러오는 중입니다.</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6">
        <p className="text-sm font-bold text-brand">공식 지원제도 · v{data.versionNumber}</p>
        <h1 className="mt-2 text-3xl font-bold">{data.title}</h1>
        <p className="mt-2 text-muted">
          {data.managingOrganization}{data.operatingOrganization ? ` · ${data.operatingOrganization}` : ""}
        </p>
        <p className="mt-2 font-semibold">거주지 제한: {data.residenceRestriction}</p>
        <p className="mt-5 leading-7">{data.fullDescription}</p>
      </section>
      {data.eligibility ? (
        <section className="rounded-3xl border border-brand/30 bg-emerald-50 p-6">
          <p className="text-sm font-bold">내 조건 기준 사전 평가</p>
          <h2 className="mt-1 text-2xl font-bold">{data.eligibility.label}</h2>
          <div className="mt-5 grid gap-3">
            {data.eligibility.ruleResults.map((rule, index) => (
              <article key={`${rule.ruleType}-${index}`} className="rounded-2xl bg-white p-4">
                <div className="flex justify-between gap-3"><strong>{rule.ruleType}</strong><span className="font-bold">{rule.outcome}</span></div>
                <p className="mt-2 text-sm">{rule.approvedMessage}</p>
                <p className="mt-1 text-xs text-muted">
                  기준: {rule.criteriaSummary}{rule.sourceLocation ? ` · 출처 위치: ${rule.sourceLocation}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-line p-6">
          <h2 className="font-bold">내 조건 판정이 없습니다</h2>
          <p className="mt-2 text-sm text-muted">설문을 완료하면 규칙별 PASS / FAIL / UNKNOWN 근거를 확인할 수 있습니다.</p>
          <Link href="/questionnaire" className="mt-4 inline-block rounded-xl bg-brand px-4 py-3 font-bold text-white">조건 입력 시작</Link>
        </section>
      )}
      <section className="grid gap-5 rounded-3xl border border-line bg-white p-6 sm:grid-cols-2">
        <Info label="지원 내용" value={`${data.benefitType}${data.amount.description ? ` · ${data.amount.description}` : ""}`} />
        <Info label="신청 기간" value={`${data.application.status} · ${data.application.startDate ?? "-"} ~ ${data.application.endDate ?? "-"}`} />
        <Info label="신청 방법" value={data.application.method} />
        <Info label="문의처" value={data.contactInformation} />
        <Info label="필요 서류" value={data.requiredDocuments.join(", ") || "공식 안내 확인"} />
        <Info label="공식 확인일" value={data.checkedAt} />
        {data.cautionText ? <Info label="유의사항" value={data.cautionText} /> : null}
      </section>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="text-xl font-bold">공식 출처</h2>
        <ul className="mt-4 space-y-3">
          {data.sources.map((source) => (
            <li key={source.sourceUrl} className="rounded-2xl border border-line p-4">
              <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline">
                {source.documentTitle}{source.isPrimary ? " · 대표 출처" : ""}
              </a>
              <p className="mt-1 text-sm text-muted">{source.organizationName} · 확인일 {source.checkedAt}</p>
            </li>
          ))}
        </ul>
        {data.application.url ? (
          <a href={data.application.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-xl bg-brand px-5 py-3 font-bold text-white">공식 신청 페이지</a>
        ) : null}
      </section>
      <Link href="/benefits" className="inline-block font-bold underline">추천 목록으로 돌아가기</Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><h3 className="text-sm font-bold text-muted">{label}</h3><p className="mt-1 whitespace-pre-line">{value}</p></div>;
}
