"use client";

import { useEffect, useState } from "react";
import SurveyPageClient from "@/components/SurveyPageClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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

  // Gọi API lấy phiếu theo id
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
            !res.ok && (data as any)?.error
              ? (data as any).error
              : (data as any)?.error || "Không tải được phiếu khảo sát.";
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
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Đang tải phiếu khảo sát...</p>
        </div>
      </div>
    );
  }

  // Có lỗi hoặc không có survey
  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Không tải được phiếu khảo sát</AlertTitle>
          <AlertDescription>{error || "Đã xảy ra lỗi không xác định."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ✅ Hiển thị đúng PHIẾU 60s cho học sinh
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <SurveyPageClient survey={survey} />
      </main>
    </div>
  );
}
