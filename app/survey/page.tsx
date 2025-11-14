"use client";

import { useEffect, useState } from "react";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

type Props = {
  searchParams: {
    id?: string;
  };
};

export default function SurveyPage({ searchParams }: Props) {
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = searchParams.id;

  useEffect(() => {
    if (!id) {
      setError("Không có mã phiếu khảo sát (id).");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Không tải được phiếu.");
        setSurvey(data.survey);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Lỗi không xác định.");
      }
    };

    load();
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-2xl bg-white shadow p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">
            Không tải được phiếu khảo sát
          </h1>
          <p className="text-sm text-neutral-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="rounded-2xl bg-white shadow p-6 text-center text-sm text-neutral-600">
          Đang tải phiếu khảo sát...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow p-6">
        <SurveyView survey={survey} />
      </div>
    </main>
  );
}
