"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 } from "@/components/SurveyView";

type ApiResponse = {
  ok: boolean;
  error?: string;
  survey?: SurveyV2;
};

export default function SurveyPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyV2 | null>(null);

  useEffect(() => {
    async function fetchSurvey() {
      setLoading(true);
      setError(null);

      // LẤY ID TỪ URL – luôn ép về string (nếu null thì thành "")
      const id = searchParams.get("id") ?? "";

      // Nếu không có id -> báo lỗi sớm, không gọi fetch
      if (!id) {
        setError("Thiếu mã phiếu khảo sát.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          let extra = "";
          try {
            extra = await res.text();
          } catch {
            extra = "";
          }
          setError(
            `Không tải được phiếu khảo sát (HTTP ${res.status}). ${extra}`
          );
          setLoading(false);
          return;
        }

        const data: ApiResponse = await res.json();

        if (!data.ok || !data.survey) {
          setError(data.error || "Không tải được phiếu khảo sát.");
          setLoading(false);
          return;
        }

        setSurvey(data.survey);
      } catch (err: any) {
        console.error("Fetch survey error:", err);
        setError(`TypeError: ${err?.message || String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header đơn giản */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-lg text-indigo-700">
            EduMirror X
          </div>
          <nav className="text-sm text-neutral-500">Khảo sát</nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">
          Phiếu khảo sát sau tiết học
        </h1>

        {loading && (
          <div className="rounded-md bg-neutral-50 border px-4 py-3 text-sm text-neutral-600">
            Đang tải phiếu khảo sát...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <div className="font-semibold mb-1">
              Không tải được phiếu khảo sát
            </div>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && survey && (
          <section className="rounded-2xl border bg-white shadow-sm p-6">
            <SurveyView survey={survey} />
          </section>
        )}
      </main>
    </div>
  );
}
