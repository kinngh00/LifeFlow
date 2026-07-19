"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EligibilityStatus, ProgramCategory } from "@/generated/prisma/enums";
import type { BenefitRecommendations } from "../types/public-benefit.types";

const labels = {
  YOUTH_EMPLOYMENT: "청년 취업",
  YOUTH_HOUSING: "청년 주거",
} as const;
const periodLabels = {
  OPEN: "접수 중",
  UPCOMING: "접수 예정",
  CLOSED: "접수 종료",
  ALWAYS_OPEN: "상시 접수",
  NEEDS_CONFIRMATION: "기관 확인 필요",
} as const;

export function BenefitResults() {
  const router = useRouter();
  const [data, setData] = useState<BenefitRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<EligibilityStatus | "">("");
  const [category, setCategory] = useState<ProgramCategory | "">("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/recommendations/evaluate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          ...(status ? { status } : {}),
          ...(category ? { category } : {}),
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.code === "QUESTIONNAIRE_SESSION_REQUIRED"
              ? "조건 입력을 먼저 완료해 주세요."
              : "추천 결과를 불러오지 못했습니다.",
          );
        }
        return response.json();
      })
      .then((payload) => setData(payload.data))
      .catch((caught) => {
        if (caught.name !== "AbortError") setError(caught.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [status, category]);

  async function reset() {
    if (!window.confirm("입력 조건과 추천 결과를 초기화할까요?")) return;
    await fetch("/api/questionnaire/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    router.push("/questionnaire");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <strong>사전 자격 평가 안내</strong>
        <p className="mt-1">
          이 결과는 공식 승인이나 수급 자격 확정이 아닙니다. 신청 전 반드시 공식 출처를 확인하세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          상태
          <select
            aria-label="상태 필터"
            className="h-11 rounded-xl border border-line bg-white px-3"
            value={status}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setStatus(event.target.value as EligibilityStatus | "");
            }}
          >
            <option value="">전체 상태</option>
            <option value="ELIGIBLE">신청 가능성 높음</option>
            <option value="NEEDS_REVIEW">추가 확인 필요</option>
            <option value="NOT_ELIGIBLE">신청 가능성 낮음</option>
            <option value="UNDETERMINED">판정 불가</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          분야
          <select
            aria-label="분야 필터"
            className="h-11 rounded-xl border border-line bg-white px-3"
            value={category}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setCategory(event.target.value as ProgramCategory | "");
            }}
          >
            <option value="">전체 분야</option>
            <option value="YOUTH_EMPLOYMENT">청년 취업</option>
            <option value="YOUTH_HOUSING">청년 주거</option>
          </select>
        </label>
        <div className="ml-auto flex items-end gap-2">
          <Link href="/questionnaire" className="rounded-xl border border-line px-4 py-3 text-sm font-bold">
            조건 수정
          </Link>
          <button onClick={reset} className="rounded-xl px-4 py-3 text-sm font-bold text-muted underline">
            전체 초기화
          </button>
        </div>
      </div>
      {data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="상태별 요약">
          <Stat label="신청 가능성 높음" value={data.summary.eligible} />
          <Stat label="추가 확인 필요" value={data.summary.needsReview} />
          <Stat label="신청 가능성 낮음" value={data.summary.notEligible} />
          <Stat label="판정 불가" value={data.summary.undetermined} />
        </div>
      ) : null}
      {loading ? <p role="status" className="rounded-2xl border border-line bg-white p-8">추천 결과를 계산하는 중입니다.</p> : null}
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-bold text-red-700">{error}</p>
          <Link href="/questionnaire" className="mt-3 inline-block font-bold underline">조건 입력 시작</Link>
        </div>
      ) : null}
      {!loading && !error && data?.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          현재 조건과 필터에 해당하는 공개 지원제도가 없습니다.
        </div>
      ) : null}
      <div className="grid gap-4">
        {data?.items.map((item) => (
          <article key={item.versionId} className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-brand">{labels[item.category]}</p>
                <h2 className="mt-1 text-xl font-bold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted">{item.organization}</p>
                <p className="mt-1 text-sm font-semibold">거주지 제한: {item.residenceRestriction}</p>
              </div>
              <span className="rounded-full border border-line px-3 py-1 text-sm font-bold">{item.eligibilityLabel}</span>
            </div>
            <p className="mt-4 text-sm">{item.shortDescription}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center text-sm">
              <div><dt>충족</dt><dd className="font-bold">{item.matchedCount}</dd></div>
              <div><dt>미충족</dt><dd className="font-bold">{item.failedCount}</dd></div>
              <div><dt>확인 필요</dt><dd className="font-bold">{item.unknownCount}</dd></div>
            </dl>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              {item.highlights.map((value) => <li key={value}>{value}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
              <div className="text-sm text-muted">
                <p>{periodLabels[item.application.status]} · {item.application.startDate ?? "-"} ~ {item.application.endDate ?? "-"}</p>
                <p>공식 확인일 {item.sourceCheckedAt}</p>
              </div>
              <Link href={`/benefits/${item.slug}`} className="rounded-xl bg-brand px-4 py-3 font-bold text-white">상세 보기</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
