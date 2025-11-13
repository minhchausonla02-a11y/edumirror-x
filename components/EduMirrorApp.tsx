"use client";

import { useEffect, useMemo, useState } from "react";
import ResultsView, { AnalyzeResult } from "@/components/ResultsView";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

export default function EduMirrorApp() {
  // ===== STATE CHÍNH =====
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [lessonText, setLessonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chip, setChip] = useState<string>("");

  // Kết quả phân tích giáo án & Khảo sát 60s
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);

  // ===== KT–KN (tuỳ chọn) =====
  const [ktknEnabled, setKtknEnabled] = useState(true);
  const [ktknText, setKtknText] = useState(
    `Ví dụ khung chuẩn (có thể thay):
- T10-VE-1.1: Hiểu khái niệm và phép toán vectơ.
- T10-VE-1.2: Vận dụng quy tắc hình bình hành để cộng vectơ.`
  );
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState("THPT");

  // ===== EFFECT: lấy API key đã lưu =====
  useEffect(() => {
    setMounted(true);
    const k = localStorage.getItem("edumirror_key") || "";
    if (k) setApiKey(k);
  }, []);

  // ===== MASK KEY =====
  const keyMasked = useMemo(() => {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "********";
    return apiKey.slice(0, 3) + "••••••••" + apiKey.slice(-3);
  }, [apiKey]);

  // ===== HANDLERS =====
  async function handleSaveKey() {
    const inp = (document.getElementById("apiKeyInput") as HTMLInputElement)!;
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
      if (!res.ok) throw new Error(data?.error || "Không trích xuất được tệp");
      const text: string = data?.text || "";
      setLessonText(text);
      setChip(`Đã nạp: ${f.name} (${text.length.toLocaleString()} ký tự)`);
      setAnalysis(null);
      setSurvey(null);
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
      setSurvey(null); // reset khảo sát để sinh lại theo phân tích mới
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
          // aiFallback: true (mặc định) — có thể bỏ nếu chỉ dùng ngân hàng mẫu
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generate survey failed");
      setSurvey(data.survey_v2);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ===== UI =====
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="text-2xl font-bold text-indigo-700">EduMirror X</div>
          <div className="flex items-center gap-3">
            <input
              id="apiKeyInput"
              type="password"
              defaultValue={apiKey}
              placeholder="Dán API key rồi Enter"
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
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
            <button onClick={handleSaveKey} className="rounded bg-neutral-900 text-white px-4 py-2">
              Lưu API Key
            </button>
            <span className="text-xs text-neutral-500">
              {apiKey ? "Hợp lệ • " + keyMasked : "Chưa có API Key"}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      {mounted ? (
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* Khối tải/dán giáo án */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4 text-lg font-semibold flex items-center gap-2">
              <span>📁 Tải giáo án / Dán nội dung</span>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-dashed p-6 bg-neutral-50">
                <div className="flex items-center gap-3">
                  <input type="file" onChange={handleFileChange} />
                  <div className="text-sm text-neutral-600">
                    Hỗ trợ: <b>.docx</b>, <b>.pdf</b>, <b>.txt</b> (tệp .doc cũ: vui lòng chuyển sang .docx)
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
                    Áp dụng Chuẩn kiến thức – kỹ năng (CTGDPT 2018)
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
                    setChip("");
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
                    Đã phân tích: Bài học
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kết quả phân tích */}
          {analysis && (
            <section className="rounded-2xl border bg-white shadow-sm p-6">
              <div className="mb-3 text-lg font-semibold">🧪 Kết quả phân tích giáo án</div>
              <ResultsView result={analysis} lessonTitle="bai_hoc" />
            </section>
          )}

          {/* Phiếu khảo sát 60s */}
          {survey && (
            <section className="rounded-2xl border bg-white shadow-sm p-6">
              <SurveyView survey={survey} />
            </section>
          )}
        </main>
      ) : null}
    </div>
  );
}
