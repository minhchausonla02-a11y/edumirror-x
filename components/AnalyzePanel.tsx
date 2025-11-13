"use client";
import { useEffect, useState } from "react";

type AnalyzeResult = {
  outline: string[];
  objectives: string[];
  key_concepts: string[];
  common_misconceptions: string[];
  pacing_flags: string[];
  survey_items: { knowledge: string[]; metacognition: string[]; pace: string[] };
  quiz: { multiple_choice: { q: string; choices: string[]; answer: string }[] };
};

const getSavedKey = () =>
  localStorage.getItem("edumirror_key") ||
  localStorage.getItem("edumirror_api_key") ||
  localStorage.getItem("openai_api_key") ||
  "";

export default function AnalyzePanel() {
  const [lessonText, setLessonText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedKey, setSavedKey] = useState("");

  useEffect(() => setSavedKey(getSavedKey()), []);

  const handleAnalyze = async () => {
    if (!lessonText || lessonText.trim().length < 50) {
      alert("Vui lòng dán nội dung giáo án (≥ 50 ký tự).");
      return;
    }
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (savedKey) headers["x-proxy-key"] = savedKey;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({ content: lessonText, model: "gpt-4o-mini" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");
      setAnalysis(data.result);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Ô lưu key (nếu bạn đã có chỗ khác, có thể bỏ) */}
      <div className="flex gap-2 items-center">
        <input
          type="password"
          placeholder="Dán API key rồi Enter để lưu"
          defaultValue={savedKey}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              localStorage.setItem("edumirror_key", v);
              setSavedKey(v);
              alert("Đã lưu API Key.");
            }
          }}
          className="border rounded px-3 py-2 w-[360px]"
        />
        <span className="text-sm text-gray-500">Hoặc dùng .env.local trên server</span>
      </div>

      <textarea
        className="w-full h-48 border rounded p-3"
        placeholder="Dán nội dung giáo án tại đây (hoặc đổ text từ bước upload → extractText)."
        value={lessonText}
        onChange={(e) => setLessonText(e.target.value)}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60"
      >
        {loading ? "Đang phân tích..." : "Phân tích giáo án"}
      </button>

      {analysis && (
        <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      )}
    </div>
  );
}
