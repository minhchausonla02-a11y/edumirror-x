"use client";

import type React from "react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ResultsView, { AnalyzeResult } from "@/components/ResultsView";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";
import DashboardView from "@/components/DashboardView";
import AISuggestionsView from "@/components/AISuggestionsView";
// DANH SÁCH MODEL HỖ TRỢ
const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Nhanh & Rẻ - Khuyên dùng)" },
  { id: "gpt-4o", name: "GPT-4o (Thông minh nhất)" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo (Logic tốt)" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Cũ)" },
  { id: "o1-mini", name: "o1 Mini (Tư duy sâu - Chậm)" },
  { id: "o1-preview", name: "o1 Preview (Tư duy sâu - Rất mạnh)" },
];

const PRODUCTION_ORIGIN = "https://edumirror-x.vercel.app"; // Đổi thành domain thật của bạn nếu cần

type TopTab = "upload" | "dashboard" | "ai";

function EduMirrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tự động lấy tab từ URL
  const activeTab = (searchParams.get("tab") as TopTab) || "upload";

  function switchTab(tab: TopTab) {
    router.push(`/?tab=${tab}`);
  }

  // ===== STATE =====
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [lessonText, setLessonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chip, setChip] = useState<string>("");

  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  // KT-KN Options
  const [ktknEnabled, setKtknEnabled] = useState(true);
  const [ktknText, setKtknText] = useState(
    `Ví dụ khung chuẩn:\n- T10-VE-1.1: Hiểu khái niệm vectơ.\n- T10-VE-1.2: Quy tắc hình bình hành.`
  );
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState("THPT");

  useEffect(() => {
    setMounted(true);
    const k = localStorage.getItem("edumirror_key") || "";
    if (k) setApiKey(k);
  }, []);

  const keyMasked = useMemo(() => {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "********";
    return apiKey.slice(0, 3) + "••••••••" + apiKey.slice(-3);
  }, [apiKey]);

  // ===== HANDLERS =====
  async function handleSaveKey() {
    const inp = document.getElementById("apiKeyInput") as HTMLInputElement;
    const v = inp.value.trim();
    localStorage.setItem("edumirror_key", v);
    setApiKey(v);
    alert("Đã lưu API Key");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setLoading(true);
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/extractText", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không trích xuất được tệp");
      const text: string = data?.text || "";
      setLessonText(text);
      setChip(`Đã nạp: ${f.name} (${text.length.toLocaleString()} ký tự)`);
      setAnalysis(null);
      setSurvey(null);
      setSurveyId(null);
      setQrUrl("");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!lessonText || lessonText.trim().length < 50) {
      alert("Vui lòng dán nội dung giáo án (≥ 50 ký tự) hoặc tải tệp.");
      return;
    }
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const saved = localStorage.getItem("edumirror_key") || "";
      if (saved) headers["x-proxy-key"] = saved;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: lessonText,
          model,
          ktknEnabled,
          ktknText,
          subject,
          grade,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");
      setAnalysis(data.result);
      setChip("Đã phân tích: Bài học");
      setSurvey(null);
      setSurveyId(null);
      setQrUrl("");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSurvey() {
    if (!lessonText || lessonText.trim().length < 50) {
      alert("Vui lòng dán nội dung giáo án (≥ 50 ký tự) hoặc tải tệp.");
      return;
    }
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const saved = localStorage.getItem("edumirror_key") || "";
      if (saved) headers["x-proxy-key"] = saved;

      // 1) Gọi API sinh bộ câu hỏi từ AI
      const res = await fetch("/api/generate-survey", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          content: lessonText,
          apiKey: saved
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generate survey failed");

      const surveyData: SurveyV2UI = data.survey_v2;
      setSurvey(surveyData);
      
      // 2) LƯU NGAY LẬP TỨC VÀO SUPABASE
      try {
        const saveRes = await fetch("/api/save-survey", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: surveyData }),
        });
        const saveData = await saveRes.json();
        if(saveData.shortId) {
            setSurveyId(saveData.shortId);
        } else {
            console.error("Lỗi lưu Supabase:", saveData);
        }
      } catch(e) {
          console.error("Không lưu được vào Supabase", e);
      }

      setQrUrl("");

    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateQR = () => {
    if (!surveyId) {
      alert("Đang lưu phiếu lên hệ thống, vui lòng đợi 1 giây rồi bấm lại!");
      return;
    }
    
    // Lấy domain hiện tại (localhost hoặc vercel)
    const currentDomain = window.location.origin;
    const surveyUrl = `${currentDomain}/survey?id=${surveyId}`;
    
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`;
    setQrUrl(qr);
  };

  const handleOpenQRInNewTab = () => {
    if (!qrUrl) return;
    window.open(qrUrl, "_blank");
  };

  // ===== UI RENDER =====
  return (
    <div className="min-h-screen bg-white">
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-indigo-700">EduMirror X</div>
            <div className="flex items-center gap-3">
              <input
                id="apiKeyInput"
                type="password"
                defaultValue={apiKey}
                placeholder="Dán API key rồi Enter"
                className="border rounded px-3 py-2 w-[200px] md:w-[340px]"
              />
              <button onClick={handleSaveKey} className="rounded bg-neutral-900 text-white px-4 py-2 text-sm">
                Lưu Key
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto">
             {[
                {id: 'upload', label: 'Tải giáo án'},
                {id: 'dashboard', label: 'Dashboard'},
                {id: 'ai', label: 'Gợi ý AI'}
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id as TopTab)}
                    className={`px-4 py-2 rounded-t-xl border-b-2 text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.id
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
          </div>
        </div>
      </header>

      {mounted ? (
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* TAB 1: UPLOAD & SURVEY */}
          {activeTab === "upload" && (
            <>
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-6 py-4 text-lg font-semibold">📁 Tải giáo án / Dán nội dung</div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border border-dashed p-6 bg-neutral-50">
                    <input type="file" onChange={handleFileChange} />
                    {chip && <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded">{chip}</div>}
                  </div>
                  <textarea
                    className="w-full h-64 border rounded-xl p-4 text-sm"
                    placeholder="Dán giáo án vào đây..."
                    value={lessonText}
                    onChange={(e) => setLessonText(e.target.value)}
                  />
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => { setLessonText(""); setAnalysis(null); setSurvey(null); }} className="px-4 py-2 rounded border">Xoá</button>
                    <button onClick={handleAnalyze} disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
                        {loading ? "Đang xử lý..." : "Phân tích giáo án"}
                    </button>
                    <button onClick={handleGenerateSurvey} disabled={loading} className="px-4 py-2 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                        {loading ? "Đang xử lý..." : "Sinh bộ câu hỏi"}
                    </button>
                  </div>
                </div>
              </div>

              {analysis && (
                <section className="rounded-2xl border bg-white shadow-sm p-6">
                  <div className="mb-3 text-lg font-semibold">🧪 Kết quả phân tích</div>
                  <ResultsView result={analysis} lessonTitle="bai_hoc" />
                </section>
              )}

              {survey && (
                <section className="rounded-2xl border bg-white shadow-sm p-6 flex flex-col md:flex-row gap-8">
                   <div className="flex-1">
                      <div className="mb-3 text-lg font-semibold">Xem trước phiếu 60 giây</div>
                      <SurveyView survey={survey} />
                   </div>
                   
                   <div className="flex-1 flex flex-col items-center justify-center space-y-4 border-l pl-8">
                      <div className="text-center">
                          <h3 className="font-bold text-xl text-gray-800 mb-2">Sẵn sàng triển khai?</h3>
                          <p className="text-sm text-gray-500 mb-4">Bấm nút dưới để tạo mã QR cho học sinh quét</p>
                          
                          <button
                            type="button"
                            onClick={handleGenerateQR}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:scale-105 transition-transform"
                          >
                            Tạo mã QR Lớp học
                          </button>
                      </div>

                      {qrUrl && (
                        <div className="flex flex-col items-center animate-fade-in-up">
                          <img src={qrUrl} alt="QR" className="border-4 border-white shadow-xl rounded-xl w-64 h-64 bg-white" />
                          <div className="mt-4 flex gap-2">
                             <button onClick={handleOpenQRInNewTab} className="text-sm text-indigo-600 underline">Mở link trực tiếp</button>
                          </div>
                        </div>
                      )}
                   </div>
                </section>
              )}
            </>
          )}

          {/* TAB 2: DASHBOARD */}
          {activeTab === "dashboard" && (
            <section className="rounded-2xl border bg-white shadow-sm p-6">
              <DashboardView />
            </section>
          )}

          {/* TAB 3: AI */}
          {activeTab === "ai" && (
            <section className="rounded-2xl border bg-white shadow-sm p-6">
              <AISuggestionsView lessonText={lessonText} analysis={analysis} apiKey={apiKey} model={model} />
            </section>
          )}
        </main>
      ) : null}
    </div>
  );
}

export default function EduMirrorApp() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang tải ứng dụng...</div>}>
      <EduMirrorContent />
    </Suspense>
  );
}