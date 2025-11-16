"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getClientApiKey } from "@/lib/apiKey";

type FeedbackStats = {
  understood: number;
  notClear: number;
  tooFast: number;
  needExamples: number;
  total: number;
};

export default function DashboardView() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lấy giáo án đang mở trong app (Upload + phân tích)
  const lessonText = useAppStore((s) => s.lessonText || "");

  // --- Gợi ý AI ---
  const [aiSuggest, setAiSuggest] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  async function handleAI() {
    try {
      setAiSuggest("");
      setLoadingAI(true);

      // 1) Lấy API Key giống như bên AnalyzePanel / ApiKeyPanel
      const clientKey = getClientApiKey();

      if (!clientKey || !clientKey.key) {
        setAiSuggest(
          "Chưa có API Key. Vui lòng nhập API Key ở góc trên cùng bên phải rồi bấm 'Lưu API Key', sau đó thử lại."
        );
        return;
      }

      if (!stats) {
        setAiSuggest("Chưa có dữ liệu thống kê 60s để phân tích.");
        return;
      }

      // 2) Gọi API /api/ai-reflect
      const res = await fetch("/api/ai-reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats,
          lessonPlan: lessonText,
          apiKey: clientKey.key,
          model: clientKey.model ?? "gpt-4o-mini",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiSuggest(data?.error || "Không gọi được AI phân tích.");
        return;
      }

      setAiSuggest(data.result || "AI không trả về gợi ý nào.");
    } catch (err: any) {
      console.error(err);
      setAiSuggest(err?.message || "Có lỗi khi gọi AI.");
    } finally {
      setLoadingAI(false);
    }
  }

  // --- Load thống kê 60s từ /api/feedback ---
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/feedback", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Không lấy được dữ liệu khảo sát");
        }

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Có lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-neutral-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Không có dữ liệu nào."}
      </div>
    );
  }

  const { understood, notClear, tooFast, needExamples, total } = stats;
  const percent = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Tổng quan */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Số phiếu 60s
          </p>
          <p className="mt-2 text-3xl font-semibold">{total}</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Hiểu bài
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">
            {understood} HS
          </p>
          <p className="text-xs text-neutral-500">
            ≈ {percent(understood)}% lớp cho biết hiểu bài.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Cần giảng chậm / rõ hơn
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-600">
            {notClear + tooFast} HS
          </p>
          <p className="text-xs text-neutral-500">
            Gồm {notClear} em chưa rõ + {tooFast} em thấy hơi nhanh.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Cần thêm ví dụ
          </p>
          <p className="mt-1 text-lg font-semibold text-blue-600">
            {needExamples} HS
          </p>
          <p className="text-xs text-neutral-500">
            ≈ {percent(needExamples)}% mong muốn thêm ví dụ minh hoạ.
          </p>
        </div>
      </div>

      {/* Thanh biểu đồ đơn giản */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">
          Phân bố phản hồi trong tiết học gần đây
        </h2>

        <div className="mt-4 space-y-3">
          {[
            {
              label: "Hiểu bài",
              value: understood,
              color: "bg-emerald-500",
            },
            {
              label: "Chưa rõ nội dung",
              value: notClear,
              color: "bg-amber-500",
            },
            {
              label: "Tiết dạy hơi nhanh",
              value: tooFast,
              color: "bg-orange-500",
            },
            {
              label: "Cần thêm ví dụ",
              value: needExamples,
              color: "bg-blue-500",
            },
          ].map((row) => {
            const p = percent(row.value);
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-neutral-500">
                    {row.value} HS • {p}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full ${row.color} transition-all`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        * Những số liệu này lấy từ API <code>/api/feedback</code> (lưu trên
        Upstash). Mỗi lần HS gửi phiếu 60s, thống kê sẽ được cập nhật.
      </p>

      {/* ---- Gợi ý cải tiến bằng AI ---- */}
      <section
        id="ai"
        className="mt-6 p-4 border rounded-xl bg-white shadow space-y-3"
      >
        <h3 className="font-semibold">Gợi ý cải tiến bài dạy bằng AI</h3>
        <p className="text-xs text-neutral-500">
          AI sẽ đọc số liệu Phiếu 60s và (nếu có) trích đoạn giáo án để gợi ý
          cách điều chỉnh tốc độ, cách giảng và ví dụ minh hoạ cho tiết sau.
        </p>

        <button
          onClick={handleAI}
          disabled={loadingAI}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {loadingAI ? "Đang phân tích..." : "Phân tích & Gợi ý ngay"}
        </button>

        {aiSuggest && (
          <div className="mt-2 p-3 border rounded-md bg-neutral-50 whitespace-pre-line text-sm">
            {aiSuggest}
          </div>
        )}
      </section>
    </div>
  );
}
