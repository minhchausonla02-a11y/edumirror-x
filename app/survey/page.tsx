"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 } from "@/components/SurveyView";

export default function SurveyFillPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyV2 | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");

    if (!id) {
      setError("Thiếu mã phiếu khảo sát.");
      setLoading(false);
      return;
    }

    async function loadSurvey() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Không tải được phiếu khảo sát");
        }

        setSurvey(json.survey as SurveyV2);
      } catch (err: unknown) {
        console.error("Lỗi tải phiếu:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Lỗi không xác định khi tải phiếu khảo sát."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-indigo-700">EduMirror X</div>
          <nav className="text-sm text-neutral-500">Khảo sát</nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">
          Phiếu khảo sát sau tiết học
        </h1>

        {loading && (
          <div className="rounded-xl border border-dashed bg-white px-4 py-6 text-sm text-neutral-600">
            Đang tải phiếu khảo sát...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold mb-1">
              Không tải được phiếu khảo sát
            </div>
            <div className="text-xs break-all">{error}</div>
          </div>
        )}

        {!loading && !error && survey && (
          <div className="rounded-2xl border bg-white shadow-sm p-4">
            <SurveyView survey={survey} />
          </div>
        )}
      </main>
    </div>
  );
}
