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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lấy id từ query ?id=... trong URL mà QR mở ra
  const id = searchParams.id;

  useEffect(() => {
    // Không có id ⇒ báo lỗi luôn
    if (!id) {
      setError("Không có mã phiếu khảo sát (id).");
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Không tải được phiếu khảo sát.");
        }

        // API trả về survey_v2
        const surveyData: SurveyV2UI = data.survey_v2 || data.survey;
        if (!surveyData) {
          throw new Error("Không tìm thấy phiếu khảo sát tương ứng.");
        }

        setSurvey(surveyData);
      } catch (e: any) {
        setError(e.message || "Lỗi không xác định khi tải phiếu khảo sát.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  // ===== UI =====
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-neutral-700">
          Đang tải phiếu khảo sát...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-red-700 bg-red-50">
          <div className="font-semibold mb-1">Không tải được phiếu khảo sát</div>
          <div>{error}</div>
        </div>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-neutral-700">
          Không tìm thấy nội dung phiếu khảo sát.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Phiếu phản hồi 60 giây sau tiết học
        </h1>
        <section className="rounded-2xl border bg-white shadow-sm p-6">
          <SurveyView survey={survey} />
        </section>
      </div>
    </main>
  );
}
