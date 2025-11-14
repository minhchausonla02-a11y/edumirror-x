"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

export default function SurveyPage() {
  const searchParams = useSearchParams();

  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Đọc id trực tiếp từ URL, ví dụ:
  // https://edumirror-x.vercel.app/survey?id=ck824Nwe&zarsrc=...
  const id = searchParams.get("id");

  useEffect(() => {
    // Không có id trong URL
    if (!id) {
      setError("Không có mã phiếu khảo sát (id).");
      setSurvey(null);
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/survey?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            // tránh cache để HS nào vào cũng lấy bản mới
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Không tải được phiếu khảo sát."
          );
        }

        const surveyData: SurveyV2UI = data.survey_v2;
        setSurvey(surveyData);
      } catch (e: any) {
        console.error("Lỗi tải phiếu:", e);
        setError(e.message || "Không tải được phiếu khảo sát.");
        setSurvey(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  // ====== CÁC TRẠNG THÁI GIAO DIỆN ======

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-neutral-700 bg-white">
          Đang tải phiếu khảo sát...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-red-700 bg-red-50">
          <div className="font-semibold mb-1">
            Không tải được phiếu khảo sát
          </div>
          <div>{error}</div>
        </div>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="rounded-xl border px-6 py-4 shadow-sm text-sm text-neutral-700 bg-white">
          Không tìm thấy nội dung phiếu khảo sát.
        </div>
      </main>
    );
  }

  // ====== GIAO DIỆN LÀM PHIẾU BÌNH THƯỜNG ======
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
