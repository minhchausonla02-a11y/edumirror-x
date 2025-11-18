"use client";

import { useEffect, useState } from "react";
import { BarChart3, Activity, SmilePlus, AlertTriangle } from "lucide-react";

type SurveyListItem = {
  id: number;
  shortId: string;
  title: string;
  createdAt: string;
};

type Counts = Record<string, number>;
type Percents = Record<string, number>;

type Summary = {
  shortId: string;
  totalResponses: number;
  understanding: { counts: Counts; percents: Percents };
  pace: { counts: Counts; percents: Percents };
  confidence: { counts: Counts; percents: Percents };
  emotion: { counts: Counts; percents: Percents };
  weakParts: { counts: Counts };
  misconceptions: { counts: Counts };
  nextNeeds: { counts: Counts };
};

type SummaryResponse =
  | { ok: true; summary: Summary }
  | { ok: true; summary?: undefined; message?: string }
  | { ok: false; error: string };

type ListSurveysResponse =
  | { ok: true; surveys: SurveyListItem[] }
  | { ok: false; error: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PercentBar({
  label,
  percent,
  count,
}: {
  label: string;
  percent: number;
  count: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-700">{label}</span>
        <span className="font-medium text-neutral-900">
          {percent}% <span className="text-neutral-500">({count})</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TagList({
  title,
  counts,
  total,
  icon,
}: {
  title: string;
  counts: Counts;
  total: number;
  icon?: React.ReactNode;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        </div>
        <p className="text-sm text-neutral-500">
          Chưa có dữ liệu cho mục này.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([label, count]) => {
          const percent =
            total > 0 ? Math.round((count * 100) / total) : 0;
          return (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-800"
            >
              <span className="font-medium">{percent}%</span>
              <span className="text-[11px] text-indigo-900/80">
                {label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardView() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [selectedShortId, setSelectedShortId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lấy danh sách survey
  useEffect(() => {
    async function fetchList() {
      try {
        setLoadingList(true);
        setError(null);
        const res = await fetch("/api/list-surveys", {
          cache: "no-store",
        });
        const data: ListSurveysResponse = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(
            (data as any)?.error ||
              "Không tải được danh sách phiếu khảo sát."
          );
        }

        setSurveys(data.surveys);
        if (data.surveys.length > 0) {
          setSelectedShortId((prev) => prev ?? data.surveys[0].shortId);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Lỗi khi tải danh sách phiếu.");
      } finally {
        setLoadingList(false);
      }
    }

    fetchList();
  }, []);

  // Lấy summary khi chọn shortId
  useEffect(() => {
    if (!selectedShortId) {
      setSummary(null);
      return;
    }

    async function fetchSummary() {
      try {
        setLoadingSummary(true);
        setError(null);

        const res = await fetch(
          `/api/survey-summary?shortId=${encodeURIComponent(
            selectedShortId
          )}`,
          { cache: "no-store" }
        );
        const data: SummaryResponse = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(
            (data as any)?.error || "Không tải được thống kê phiếu."
          );
        }

        if (!("summary" in data) || !data.summary) {
          setSummary(null);
        } else {
          setSummary(data.summary);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Lỗi khi tải thống kê.");
      } finally {
        setLoadingSummary(false);
      }
    }

    fetchSummary();
  }, [selectedShortId]);

  const currentSurvey = surveys.find(
    (s) => s.shortId === selectedShortId
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề & chọn bài */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Dashboard sau tiết học
          </h1>
          <p className="text-sm text-neutral-500">
            Xem nhanh mức độ hiểu bài, điểm yếu và nhu cầu của học sinh
            theo từng phiếu 60 giây.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <label className="text-xs font-medium text-neutral-600">
            Chọn phiếu / bài học
          </label>
          <select
            className="min-w-[260px] rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            disabled={loadingList || surveys.length === 0}
            value={selectedShortId ?? ""}
            onChange={(e) => setSelectedShortId(e.target.value)}
          >
            {surveys.length === 0 && (
              <option value="">Chưa có phiếu nào</option>
            )}
            {surveys.map((s) => (
              <option key={s.id} value={s.shortId}>
                {s.title} — {formatDate(s.createdAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Nếu chưa chọn hoặc chưa có summary */}
      {!summary && !loadingSummary && (
        <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm">
          {surveys.length === 0
            ? "Chưa có phiếu 60 giây nào được tạo. Hãy tạo phiếu từ giáo án trước."
            : "Chưa có học sinh nào gửi phiếu cho QR này hoặc thống kê đang được cập nhật."}
        </div>
      )}

      {/* Loading */}
      {loadingSummary && (
        <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm">
          Đang tải thống kê…
        </div>
      )}

      {/* Nội dung chính khi đã có summary */}
      {summary && !loadingSummary && (
        <div className="space-y-6">
          {/* Hàng 1: cards tổng quan */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Số phiếu thu được
                </p>
                <p className="text-xl font-semibold text-neutral-900">
                  {summary.totalResponses}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Mức hiểu bài tích cực
                </p>
                <p className="text-xl font-semibold text-neutral-900">
                  {(() => {
                    const p = summary.understanding.percents;
                    let good = 0;
                    for (const [label, percent] of Object.entries(p)) {
                      if (
                        label.includes("rất rõ") ||
                        label.includes("khá rõ")
                      ) {
                        good += percent;
                      }
                    }
                    return `${good || 0}%`;
                  })()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Tín hiệu cần chú ý
                </p>
                <p className="text-xs text-neutral-600">
                  Xem mục “Phần còn yếu" và “Chỗ dễ nhầm” bên dưới.
                </p>
              </div>
            </div>
          </div>

          {/* Hàng 2: hiểu bài / tốc độ / tự tin / cảm xúc */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Hiểu bài */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Mức độ hiểu bài
              </h3>
              <div className="space-y-2">
                {Object.entries(summary.understanding.percents).map(
                  ([label, percent]) => (
                    <PercentBar
                      key={label}
                      label={label}
                      percent={percent}
                      count={summary.understanding.counts[label] || 0}
                    />
                  )
                )}
              </div>
            </div>

            {/* Tốc độ */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Tốc độ giảng bài
              </h3>
              <div className="space-y-2">
                {Object.entries(summary.pace.percents).map(
                  ([label, percent]) => (
                    <PercentBar
                      key={label}
                      label={label}
                      percent={percent}
                      count={summary.pace.counts[label] || 0}
                    />
                  )
                )}
              </div>
            </div>

            {/* Tự tin */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Độ tự tin làm bài
              </h3>
              <div className="space-y-2">
                {Object.entries(summary.confidence.percents).map(
                  ([label, percent]) => (
                    <PercentBar
                      key={label}
                      label={label}
                      percent={percent}
                      count={summary.confidence.counts[label] || 0}
                    />
                  )
                )}
              </div>
            </div>

            {/* Cảm xúc */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                Cảm xúc sau tiết học
              </h3>
              <div className="space-y-2">
                {Object.keys(summary.emotion.counts).length === 0 && (
                  <p className="text-xs text-neutral-500">
                    Học sinh chưa chọn mục cảm xúc.
                  </p>
                )}
                {Object.entries(summary.emotion.percents).map(
                  ([label, percent]) => (
                    <PercentBar
                      key={label}
                      label={label}
                      percent={percent}
                      count={summary.emotion.counts[label] || 0}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          {/* Hàng 3: phần yếu / nhầm lẫn / nhu cầu tiết sau */}
          <div className="grid gap-4 md:grid-cols-3">
            <TagList
              title="Phần nội dung còn yếu"
              counts={summary.weakParts.counts}
              total={summary.totalResponses}
              icon={
                <Activity className="h-4 w-4 text-indigo-500" />
              }
            />
            <TagList
              title="Chỗ học sinh dễ nhầm lẫn"
              counts={summary.misconceptions.counts}
              total={summary.totalResponses}
              icon={
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              }
            />
            <TagList
              title="Học sinh mong muốn tiết sau"
              counts={summary.nextNeeds.counts}
              total={summary.totalResponses}
              icon={<SmilePlus className="h-4 w-4 text-emerald-500" />}
            />
          </div>

          {/* Gợi ý tiếp theo (chưa dùng AI, chỉ hướng dẫn) */}
          <div className="rounded-2xl border bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-sm text-slate-100 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">
              Bước tiếp theo
            </h3>
            <p className="text-slate-200/90">
              Khi đã thu được đủ số phiếu cho một bài, thầy/cô có thể
              dùng các thống kê này để điều chỉnh tiết dạy tiếp theo:
              ưu tiên các phần có tỉ lệ “chưa vững” và “dễ nhầm cao”, đồng
              thời cân nhắc tốc độ giảng nếu nhiều em thấy “hơi nhanh”.
              Ở bước sau, chúng ta sẽ thêm một ô “Gợi ý AI” tự động đề
              xuất kế hoạch điều chỉnh cụ thể cho tiết sau.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
