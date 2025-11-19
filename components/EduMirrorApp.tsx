"use client";

import type React from "react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // Thêm useRouter
import ResultsView, { AnalyzeResult } from "@/components/ResultsView";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";
import DashboardView from "@/components/DashboardView";

const PRODUCTION_ORIGIN = "https://edumirror-x.vercel.app";

type TopTab = "upload" | "dashboard" | "ai";

// Tách logic chính ra thành component con để dùng được Suspense
function EduMirrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tự động lấy tab từ URL, nếu không có thì mặc định là 'upload'
  const activeTab = (searchParams.get("tab") as TopTab) || "upload";

  // Hàm chuyển tab: Đẩy URL mới vào trình duyệt
  function switchTab(tab: TopTab) {
    router.push(`/?tab=${tab}`);
  }

  // ===== STATE CHÍNH (Giữ nguyên như cũ) =====
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

  // ... (Các hàm xử lý Logic giữ nguyên: handleSaveKey, handleFileChange, handleAnalyze...)
  // Để tiết kiệm chỗ, bạn hãy Giữ Nguyên các hàm logic cũ từ dòng handleSaveKey đến hết handleOpenQRInNewTab
  // Chỉ thay đổi phần return giao diện bên dưới:

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
      const res = await fetch("/api/extractText", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lỗi đọc file");
      setLessonText(data?.text || "");
      setChip(`Đã nạp: ${f.name}`);
    } catch (err: any) { alert("Lỗi: " + err.message); } finally { setLoading(false); }
  }
    
  // ... (Bạn hãy giữ nguyên các hàm logic handleAnalyze, handleGenerateSurvey, handleGenerateQR cũ ở đây) ...
  // Tôi viết tắt để bạn dễ copy, logic AI không thay đổi.
  async function handleAnalyze() { /* Logic cũ */ }
  async function handleGenerateSurvey() { /* Logic cũ */ }
  function handleGenerateQR() { /* Logic cũ */ }
  function handleOpenQRInNewTab() { if(qrUrl) window.open(qrUrl, "_blank"); }


  // ===== UI =====
  return (
    <div className="min-h-screen bg-white">
      {/* Header Controller */}
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-indigo-700">EduMirror X</div>
            {/* API Key Control */}
            <div className="flex items-center gap-3">
                 <input id="apiKeyInput" type="password" defaultValue={apiKey} placeholder="API Key" className="border rounded px-3 py-2 w-[200px]" />
                 <button onClick={handleSaveKey} className="rounded bg-neutral-900 text-white px-3 py-2 text-sm">Lưu Key</button>
            </div>
          </div>

          {/* Tabs Control - ĐỒNG BỘ VỚI URL ?tab= */}
          <div className="mt-3 flex gap-2">
            {[
                {id: 'upload', label: 'Tải giáo án'},
                {id: 'dashboard', label: 'Dashboard'},
                {id: 'ai', label: 'Gợi ý AI'}
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id as TopTab)}
                    className={`px-4 py-2 rounded-t-xl border-b-2 text-sm font-medium ${
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

      {/* Main Content */}
      {mounted ? (
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* TAB 1: UPLOAD */}
          {activeTab === "upload" && (
            <div className="rounded-2xl border bg-white shadow-sm p-6">
                <div className="mb-4 text-lg font-semibold">📁 Tải giáo án / Dán nội dung</div>
                <textarea 
                    className="w-full h-64 border rounded-xl p-4 text-sm mb-4" 
                    placeholder="Dán nội dung bài học..." 
                    value={lessonText}
                    onChange={(e) => setLessonText(e.target.value)}
                />
                <div className="flex gap-3">
                    <button onClick={handleAnalyze} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Phân tích ngay</button>
                    {/* Các nút khác của bạn */}
                </div>
            </div>
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
              <h2 className="text-lg font-semibold">🤖 Gợi ý AI</h2>
              <p className="text-gray-600 mt-2">Nội dung gợi ý sẽ hiển thị ở đây...</p>
            </section>
          )}
        </main>
      ) : null}
    </div>
  );
}

// BỌC SUSPENSE ĐỂ TRÁNH LỖI KHI BUILD
export default function EduMirrorApp() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang tải ứng dụng...</div>}>
      <EduMirrorContent />
    </Suspense>
  );
}