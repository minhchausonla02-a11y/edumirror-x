"use client";

import type React from "react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ResultsView, { AnalyzeResult } from "@/components/ResultsView";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";
import DashboardView from "@/components/DashboardView";
import AISuggestionsView from "@/components/AISuggestionsView";
import AILoading from "@/components/AILoading";

// DANH SÁCH MODEL (Giữ nguyên của bạn)
const AVAILABLE_MODELS = [
  { id: "gpt-5.1", name: "GPT-5.1 (Siêu trí tuệ - Mới nhất)" },
  { id: "gpt-5-mini", name: "GPT-5.1 Mini (Tiết Kiệm Với Tốc độ ánh sáng)" },
  { id: "gpt-4o", name: "GPT-4o (Thông minh & Ổn định)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Tốc độ cao)" },
  { id: "o1-preview", name: "o1 Preview (Tư duy sâu)" },
];

type TopTab = "upload" | "dashboard" | "ai";

function EduMirrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as TopTab) || "upload";

  function switchTab(tab: TopTab) {
    router.push(`/?tab=${tab}`);
  }

  // STATE
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");

  // Dữ liệu đầu vào
  const [lessonText, setLessonText] = useState("");
  const [standardsText, setStandardsText] = useState("");
  const [subject, setSubject] = useState("Toán học");
  const [grade, setGrade] = useState("Lớp 10");
  const [processMode, setProcessMode] = useState<"standard" | "premium">("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [chip, setChip] = useState<string>(""); // giữ nguyên nếu bạn cần hiển thị sau
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    const k = localStorage.getItem("edumirror_key") || "";
    if (k) setApiKey(k);
  }, []);

  // HANDLERS
  const handleSaveKey = () => {
    const inp = document.getElementById("apiKeyInput") as HTMLInputElement;
    const v = inp.value.trim();
    localStorage.setItem("edumirror_key", v);
    setApiKey(v);
    alert("Đã lưu API Key");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // 1. Luôn lưu file gốc (Quan trọng cho chế độ Cao cấp)
    setSelectedFile(f);
    setChip(`Đã chọn: ${f.name}`);

    // 2. Vẫn thử rút text (Để dùng cho chế độ Tốc độ/Xem trước)
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/extractText", { method: "POST", body: form });
      const data = await res.json();
      setLessonText(data?.text || "");

      // Reset kết quả cũ
      setAnalysis(null);
      setSurvey(null);
      setSurveyId(null);
      setQrUrl("");
    } catch (err: any) {
      console.warn("Rút text thất bại (có thể dùng chế độ Cao cấp):", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem("edumirror_key") || "";
      let data: any;

      if (processMode === "premium") {
        if (!selectedFile) {
          setLoading(false);
          return alert("Chế độ Cao cấp yêu cầu bạn phải Upload File (Word/PDF/Ảnh)!");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("model", "gpt-4o-mini"); // giữ như bạn đang dùng
        formData.append("subject", subject);
        formData.append("grade", grade);
        formData.append("apiKey", saved);

        const res = await fetch("/api/analyze-premium", {
          method: "POST",
          body: formData,
        });

        data = await res.json();
        if (!res.ok) throw new Error(data?.error);
      } else {
        if (lessonText.length < 50) {
          setLoading(false);
          return alert("Nội dung quá ngắn! Hãy dán văn bản hoặc Upload file.");
        }
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-proxy-key": saved },
          body: JSON.stringify({ content: lessonText, model, subject, grade }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data?.error);
      }

      setAnalysis(data.result);

      if (processMode === "premium" && data.result?.summary) {
        setLessonText(
          `[KẾT QUẢ TỪ CHẾ ĐỘ CAO CẤP]\n📂 File: ${selectedFile?.name}\n-------------------\n${data.result.summary}`
        );
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSurvey = async () => {
    if (lessonText.length < 50) return alert("Nội dung giáo án quá ngắn");
    setLoading(true);
    try {
      const saved = localStorage.getItem("edumirror_key") || "";

      const res = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          content: lessonText,
          standards: standardsText,
          apiKey: saved,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);

      const surveyData = data.survey_v2;
      setSurvey(surveyData);

      try {
        const saveRes = await fetch("/api/save-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: surveyData }),
        });
        const saveData = await saveRes.json();
        if (saveData.shortId) setSurveyId(saveData.shortId);
      } catch (e) {
        console.error("Lỗi lưu:", e);
      }

      setQrUrl("");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = () => {
    if (!surveyId) return alert("Đang lưu phiếu, vui lòng đợi 1 giây!");
    const currentDomain = window.location.origin;
    const surveyUrl = `${currentDomain}/survey?id=${surveyId}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      surveyUrl
    )}`;
    setQrUrl(qr);
  };

  const handleOpenQRInNewTab = () => {
    if (qrUrl) window.open(qrUrl, "_blank");
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-gray-900 relative">
      {loading && <AILoading />}

      {/* HEADER */}
      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪞</span>
              <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                EduMirror X
              </div>
            </div>

            {/* ✅ GIỮ NGUYÊN: header chỉ còn chọn model (không còn API key ở đây) */}
            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-gray-50 text-xs font-bold text-indigo-700 px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-indigo-50"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-6 border-b border-gray-100">
            {[
              { id: "upload", label: "1. Soạn bài & Sinh phiếu" },
              { id: "dashboard", label: "2. Báo cáo Lớp học" },
              { id: "ai", label: "3. Tư vấn Sư phạm" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as TopTab)}
                className={`pb-3 text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {mounted ? (
        <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
          {/* ✅ TAB UPLOAD: thêm block API key + giữ nguyên grid cũ */}
          {activeTab === "upload" && (
            <>
              {/* 🔑 KHỐI NHẬP API KEY (đặt xa dropdown tài khoản) */}
              <section className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-gray-800">🔑 Nhập API Key</div>
                    <div className="text-xs text-gray-500">
                      Tài khoản mới chưa có API key → nhập tại đây để dùng AI (phân tích, sinh phiếu, dashboard).
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="apiKeyInput"
                      type="password"
                      defaultValue={apiKey}
                      placeholder="Dán API key..."
                      className="outline-none px-3 py-2 text-sm w-[320px] md:w-[420px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                    <button
                      onClick={handleSaveKey}
                      className="bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* CỘT TRÁI: INPUT (8 phần) */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        📄 Nội dung bài dạy
                      </h3>
                      <div className="flex gap-2">
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1 outline-none font-medium"
                        >
                          <option>Toán học</option>
                          <option>Vật lý</option>
                          <option>Ngữ văn</option>
                          <option>Tiếng Anh</option>
                        </select>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1 outline-none font-medium"
                        >
                          <option>Lớp 10</option>
                          <option>Lớp 11</option>
                          <option>Lớp 12</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative group">
                      <textarea
                        className="w-full h-64 p-5 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none leading-relaxed"
                        placeholder="Dán nội dung giáo án vào đây..."
                        value={lessonText}
                        onChange={(e) => setLessonText(e.target.value)}
                      />
                      <div className="absolute bottom-4 right-4">
                        <label className="cursor-pointer bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-all">
                          📁 Upload File
                          <input type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* INPUT CHUẨN (MỚI) */}
                  <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                      🎯 Hệ quy chiếu / Chuẩn đầu ra (Tùy chọn)
                      <span className="bg-indigo-200 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">
                        Khuyên dùng
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-400 mb-3">
                      Nếu nhập, AI sẽ đối chiếu giáo án với chuẩn này để sinh câu hỏi sát sườn hơn.
                    </p>
                    <textarea
                      className="w-full h-24 p-4 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                      placeholder="VD: Học sinh biết cách giải và biện luận bất phương trình bậc nhất hai ẩn..."
                      value={standardsText}
                      onChange={(e) => setStandardsText(e.target.value)}
                    />
                  </div>

                  {/* Kết quả phân tích */}
                  {analysis && (
                    <section className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm animate-fade-in-up">
                      <ResultsView result={analysis} lessonTitle="bai_hoc" />
                    </section>
                  )}
                </div>

                {/* CỘT PHẢI: ACTION CENTER (4 phần) */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-4">Trung tâm Tác vụ</h3>

                      {/* BỘ CHUYỂN ĐỔI CHẾ ĐỘ */}
                      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-800 rounded-xl border border-gray-700">
                        <button
                          onClick={() => setProcessMode("standard")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                            processMode === "standard"
                              ? "bg-gray-600 text-white shadow-md ring-1 ring-gray-400"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          <span>🚀 Tốc độ</span>
                          <span className="text-[9px] font-normal opacity-70">Văn bản thường</span>
                        </button>

                        <button
                          onClick={() => setProcessMode("premium")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                            processMode === "premium"
                              ? "bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-lg shadow-orange-500/30 transform scale-105"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          <span>💎 Cao cấp</span>
                          <span className="text-[9px] font-normal opacity-70">Toán/Lý/Hóa</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={handleAnalyze}
                          disabled={loading}
                          className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? "Đang đọc..." : "🔍 Phân tích cấu trúc"}
                        </button>

                        <button
                          onClick={handleGenerateSurvey}
                          disabled={loading}
                          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? "Đang xử lý..." : "✨ Sinh Phiếu Khảo sát"}
                        </button>

                        <button
                          onClick={() => {
                            setLessonText("");
                            setStandardsText("");
                            setSurvey(null);
                            setSelectedFile(null);
                            setAnalysis(null);
                            setSurveyId(null);
                            setQrUrl("");
                          }}
                          className="w-full py-2 text-gray-500 text-xs hover:text-white underline"
                        >
                          Làm mới
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  {survey && (
                    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm animate-fade-in-up">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
                        Xem trước Mobile
                      </h3>
                      <div className="border-[6px] border-gray-800 rounded-[2rem] overflow-hidden shadow-lg transform scale-95">
                        <SurveyView survey={survey} />
                      </div>
                      <div className="mt-6 text-center">
                        {qrUrl ? (
                          <div className="animate-fade-in">
                            <img
                              src={qrUrl}
                              alt="QR"
                              className="w-40 h-40 mx-auto border-4 border-white shadow-lg rounded-xl mb-3"
                            />
                            <button
                              onClick={handleOpenQRInNewTab}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Mở link trực tiếp ↗
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleGenerateQR}
                            className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
                          >
                            Tạo mã QR Lớp học
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "dashboard" && (
            <section className="rounded-3xl border bg-white shadow-sm p-8 min-h-[600px]">
              <DashboardView model={model} />
            </section>
          )}

          {activeTab === "ai" && (
            <section className="rounded-3xl border bg-white shadow-sm p-8 min-h-[600px]">
              <AISuggestionsView lessonText={lessonText} apiKey={apiKey} model={model} />
            </section>
          )}
        </main>
      ) : null}
    </div>
  );
}

export default function EduMirrorApp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EduMirrorContent />
    </Suspense>
  );
}
