// app/survey/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

export default function SurveyPage() {
  const searchParams = useSearchParams();
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id"); // 👈 Lấy id từ URL đúng cách

    if (!id) {
      setError("Thiếu mã phiếu khảo sát.");
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`);
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }

        const s: SurveyV2UI =
          data.survey || data.survey_v2 || data.payload || data.data;

        setSurvey(s);
      } catch (e: any) {
        console.error("Fetch survey error:", e);
        setError(e?.message || "Không tải được phiếu khảo sát.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">
          Phiếu khảo sát sau tiết học
        </h1>

        {loading && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-neutral-600">
            Đang tải phiếu khảo sát...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center text-sm text-red-700">
            <div className="font-semibold mb-1">
              Không tải được phiếu khảo sát
            </div>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && survey && (
          <div className="rounded-2xl border bg-white shadow-sm p-6">
            <SurveyView survey={survey} />
          </div>
        )}
      </main>
    </div>
  );
}
