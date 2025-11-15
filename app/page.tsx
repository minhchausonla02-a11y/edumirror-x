"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

type ApiResponse =
  | { ok: true; survey: SurveyV2UI }
  | { ok: false; error?: string };

export default function SurveyPage() {
  const searchParams = useSearchParams();

  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      // Lấy id từ URL
      const id = searchParams.get("id");

      // Nếu không có id -> báo lỗi luôn, KHÔNG gọi fetch
      if (!id) {
        setError("Thiếu mã phiếu khảo sát.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/survey?id=${encodeURIComponent(id)}`,
          {
            cache: "no-store",
          }
        );

        const data: ApiResponse = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(
            data.ok
              ? "Không tải được phiếu khảo sát."
              : data.error || "Không tải được phiếu khảo sát."
          );
        }

        setSurvey(data.survey);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold text-indigo-700">EduMirror X</div>
          <nav className="text-sm text-neutral-600">
            <span className="font-semibold text-indigo-600">Khảo sát</span>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">
          Phiếu khảo sát sau tiết học
        </h1>

        {loading && (
          <div className="rounded-xl border border-dashed bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600">
            Đang tải phiếu khảo sát...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            <div className="font-semibold mb-1">Không tải được phiếu khảo sát</div>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && survey && (
          <div className="rounded-2xl border bg-white shadow-sm p-4 sm:p-6">
            <SurveyView survey={survey} />
          </div>
        )}
      </section>
    </main>
  );
}
