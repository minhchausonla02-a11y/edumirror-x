"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SurveyView, { SurveyV2 } from "@/components/SurveyView";

type Status = "idle" | "loading" | "loaded" | "error";

export const dynamic = "force-dynamic";

export default function SurveyPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyV2 | null>(null);

  useEffect(() => {
    // Không có id trong URL
    if (!id) {
      setStatus("error");
      setError("Thiếu mã phiếu khảo sát (id). Hãy quét lại QR hoặc hỏi GV.");
      return;
    }

    // sau if trên, chắc chắn id là string → ép kiểu cho TS
    const surveyId = id as string;

    let cancelled = false;

    async function loadSurvey() {
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch(
          `/api/survey?id=${encodeURIComponent(surveyId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // Nếu parse JSON lỗi thì bỏ qua, dùng status code
        }

        if (!res.ok) {
          const msg =
            data?.error ||
            `Server trả về mã lỗi ${res.status} ${res.statusText}`;
          throw new Error(msg);
        }

        if (!data?.survey) {
          throw new Error("Phản hồi từ server không chứa survey.");
        }

        if (!cancelled) {
          setSurvey(data.survey as SurveyV2);
          setStatus("loaded");
        }
      } catch (err: any) {
        console.error("Lỗi tải survey:", err);
        if (!cancelled) {
          setStatus("error");
          setError(err?.message || String(err));
        }
      }
    }

    loadSurvey();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header đơn giản reuse style chung */}
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <div className="text-xl font-bold text-indigo-700">
            EduMirror X
          </div>
          <nav className="text-sm text-neutral-600 flex gap-4">
            <span className="font-medium text-indigo-700">Khảo sát</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold mb-4">
          Phiếu khảo sát sau tiết học
        </h1>

        {/* Trạng thái lỗi */}
        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold mb-1">
              Không tải được phiếu khảo sát
            </div>
            <div>{error || "Đã xảy ra lỗi không xác định."}</div>
          </div>
        )}

        {/* Trạng thái đang tải */}
        {status === "loading" && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            Đang tải phiếu khảo sát, vui lòng đợi...
          </div>
        )}

        {/* Hiển thị phiếu */}
        {status === "loaded" && survey && (
          <section className="mt-4 rounded-2xl border bg-white shadow-sm p-6">
            <SurveyView survey={survey} />
          </section>
        )}
      </main>
    </div>
  );
}
