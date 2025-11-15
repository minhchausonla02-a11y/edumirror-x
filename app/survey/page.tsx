"use client";

import { useEffect, useState } from "react";
import SurveyView from "@/components/SurveyView";

type SurveyPayload = any;

type SurveyApiResponse =
  | { ok: true; survey: SurveyPayload }
  | { ok: false; error?: string };

export default function SurveyPage() {
  const [id, setId] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lấy id từ URL ?id=...
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rawId = params.get("id");

    if (!rawId) {
      setError("Thiếu mã phiếu khảo sát.");
      setLoading(false);
      return;
    }

    setId(rawId);
  }, []);

  // Gọi API /api/survey?id=...
  useEffect(() => {
    if (!id) return;

    const fetchSurvey = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/survey?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });

        const data: SurveyApiResponse = await res.json();

        if (!res.ok || !("ok" in data) || !data.ok) {
          const msg =
            (data as any)?.error || "Không tải được phiếu khảo sát.";
          setError(msg);
          setSurvey(null);
          return;
        }

        if (!("survey" in data) || !data.survey) {
          setError("Không tìm thấy phiếu khảo sát trong CSDL.");
          setSurvey(null);
          return;
        }

        setSurvey(data.survey);
      } catch (err: any) {
        console.error("Unexpected /survey page error:", err);
        setError(
          err?.message || "Lỗi không xác định khi tải phiếu khảo sát."
        );
        setSurvey(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  // Đang tải
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Đang tải phiếu khảo sát...</p>
      </div>
    );
  }

  // Có lỗi hoặc không có survey
  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          <div className="font-semibold mb-1">Không tải được phiếu khảo sát</div>
          <div>{error || "Đã xảy ra lỗi không xác định."}</div>
        </div>
      </div>
    );
  }

  // ✅ Hiển thị phiếu 60 giây sau tiết học
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900">
          Phiếu khảo sát sau tiết học
        </h1>

        {/* SurveyView là component có sẵn để render nội dung phiếu */}
        <SurveyView survey={survey} />
      </main>
    </div>
  );
}
