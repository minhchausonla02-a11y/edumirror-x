"use client";

import type React from "react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ResultsView, { AnalyzeResult } from "@/components/ResultsView";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";
import DashboardView from "@/components/DashboardView";

const PRODUCTION_ORIGIN = "https://edumirror-x.vercel.app";

type TopTab = "upload" | "dashboard" | "ai";

function EduMirrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Tự động lấy tab từ URL
  const activeTab = (searchParams.get("tab") as TopTab) || "upload";

  // Hàm chuyển tab
  function switchTab(tab: TopTab) {
    router.push(`/?tab=${tab}`);
  }

  // ===== STATE CHÍNH =====
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [lessonText, setLessonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chip, setChip] = useState<string>("");

  // Kết quả phân tích & khảo sát
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  // ===== KT–KN =====
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const saved = localStorage.getItem("edumirror_key") || "";
      if (saved) headers["x-proxy-key"] = saved;

      // 1) Gọi API sinh bộ câu hỏi
      const res = await fetch("/api/generate-survey", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          content: lessonText,
          analysis: analysis
            ? {
                objectives: analysis.objectives,
                key_concepts: analysis.key_concepts,
                common_misconceptions: analysis.common_misconceptions,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generate survey failed");

      const surveyData: SurveyV2UI = data.survey_v2;
      setSurvey(surveyData);
      setQrUrl("");
      setSurveyId(null);

      // 2) LƯU survey xuống Supabase
      try {
        const saveRes = await fetch("/api/save-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: surveyData }),
        });
        const saveData = await saveRes.json();

        if (!saveRes.ok || saveData?.ok === false) {
          throw new Error(saveData?.error || "Không lưu được phiếu khảo sát.");
        }

        const shortId = saveData.shortId || saveData.data?.shortId || null;
        if (shortId) setSurveyId(shortId);
      } catch (e: any) {
        console.error("Lỗi lưu survey:", e);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ===== QR HANDLERS =====
  function makeFallbackId(length: number = 8) {
    return Math.random().toString(36).slice(2, 2 + length);
  }

  const handleGenerateQR = () => {
    if (!survey) {
      alert("Chưa có phiếu khảo sát. Hãy bấm 'Sinh bộ câu hỏi' trước.");
      return;
    }
    const fallbackId = surveyId || (survey as any)?.shortId || null;
    const effectiveId = fallbackId || makeFallbackId(8);

    const surveyUrl = `${PRODUCTION_ORIGIN}/survey?id=${encodeURIComponent(effectiveId)}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(surveyUrl)}`;

    setQrUrl(qr);
    alert("Đã tạo mã QR. Hãy kéo xuống dưới để xem.");
  };

  const handleOpenQRInNewTab = () => {
    if (!qrUrl) return;
    window.open(qrUrl, "_blank");
  };

  // ===== UI =====
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
                className="border rounded px-3 py-2 w-[340px]"
              />
              <select
                className="border rounded px-3 py-2 h-[40px]"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
              <button
                onClick={handleSaveKey}
                className="rounded bg-neutral-900 text-white px-4 py-2"
              >
                Lưu Key
              </button>
              <span className="text-xs text-neutral-500">
                {apiKey ? "Hợp lệ • " + keyMasked : "Chưa có API Key"}
              </span>
            </div>
          </div>

          {/* Tabs Control */}
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

      {/* Main */}
      {mounted ? (
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* TAB 1: Tải giáo án / sinh phiếu */}
          {activeTab === "upload" && (
            <>
              {/* Khối tải/dán giáo án - ĐÃ KHÔI PHỤC ĐẦY ĐỦ */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-6 py-4 text-lg font-semibold flex items-center gap-2">
                  <span>📁 Tải giáo án / Dán nội dung</span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Khu vực chọn file */}
                  <div className="rounded-xl border border-dashed p-6 bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <input type="file" onChange={handleFileChange} />
                      <div className="text-sm text-neutral-600">
                        Hỗ trợ: <b>.docx</b>, <b>.pdf</b>, <b>.txt</b>
                      </div>
                    </div>
                    {chip && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs">
                        {chip}
                      </div>
                    )}
                  </div>

                  <textarea
                    className="w-full h-64 border rounded-xl p-4 text-sm"
                    placeholder="Dán giáo án hoặc nội dung văn bản tại đây..."
                    value={lessonText}
                    onChange={(e) => setLessonText(e.target.value)}
                  />

                  {/* Khối KT–KN */}
                  <div className="rounded-xl border p-4 bg-white space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        id="ktkn"
                        type="checkbox"
                        checked={ktknEnabled}
                        onChange={(e) => setKtknEnabled(e.target.checked)}
                      />
                      <label htmlFor="ktkn" className="font-medium">
                        Áp dụng Chuẩn kiến thức – kỹ năng
                      </label>

                      <select
                        className="ml-4 border rounded px-2 py-1"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      >
                        <option>Toán</option>
                        <option>Vật lí</option>
                        <option>Hóa học</option>
                        <option>Sinh học</option>
                        <option>Ngữ văn</option>
                      </select>

                      <select
                        className="border rounded px-2 py-1"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                      >
                        <option>THPT</option>
                        <option>THCS</option>
                      </select>
                    </div>

                    <textarea
                      className="w-full h-24 border rounded p-2 text-sm"
                      placeholder="Dán khung chuẩn KT–KN (tuỳ chọn)."
                      value={ktknText}
                      onChange={(e) => setKtknText(e.target.value)}
                    />
                  </div>

                  {/* Nút thao tác */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setLessonText("");
                        setAnalysis(null);
                        setSurvey(null);
                        setSurveyId(null);
                        setChip("");
                        setQrUrl("");
                      }}
                      className="px-4 py-2 rounded border"
                    >
                      Xoá
                    </button>

                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
                    >
                      {loading ? "Đang phân tích..." : "Phân tích giáo án"}
                    </button>

                    <button
                      onClick={handleGenerateSurvey}
                      disabled={loading}
                      className="px-4 py-2 rounded border"
                    >
                      {loading ? "Đang sinh câu hỏi..." : "Sinh bộ câu hỏi"}
                    </button>

                    {analysis && (
                      <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs">
                        Đã phân tích
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kết quả phân tích & Survey giữ nguyên */}
              {analysis && (
                <section className="rounded-2xl border bg-white shadow-sm p-6">
                  <div className="mb-3 text-lg font-semibold">
                    🧪 Kết quả phân tích giáo án
                  </div>
                  <ResultsView result={analysis} lessonTitle="bai_hoc" />
                </section>
              )}

              {survey && (
                <section className="rounded-2xl border bg-white shadow-sm p-6">
                  <div className="mb-3 text-lg font-semibold">
                    Xem trước phiếu 60 giây
                  </div>
                  <SurveyView survey={survey} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateQR}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Tạo mã QR cho học sinh
                    </button>
                     {qrUrl && (
                      <button
                        type="button"
                        onClick={handleOpenQRInNewTab}
                        className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                      >
                        Mở / lưu mã QR
                      </button>
                    )}
                  </div>
                   {qrUrl && (
                    <div className="mt-4">
                      <img src={qrUrl} alt="QR" className="border rounded-xl p-2 bg-white" />
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* TAB 2: Dashboard */}
          {activeTab === "dashboard" && (
            <section className="rounded-2xl border bg-white shadow-sm p-6">
              <DashboardView />
            </section>
          )}

          {/* TAB 3: AI */}
          {activeTab === "ai" && (
            <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-3">
              <h2 className="text-lg font-semibold">🤖 Gợi ý AI</h2>
              <p className="text-sm text-neutral-600">
                Hệ thống sẽ phân tích dữ liệu từ Dashboard để đưa ra gợi ý tại đây.
              </p>
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