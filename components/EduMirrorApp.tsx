"use client";

import type React from "react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";
import DashboardView from "@/components/DashboardView";
import AISuggestionsView from "@/components/AISuggestionsView";
import AILoading from "@/components/AILoading";
import SurveyEditor from "@/components/SurveyEditor";
import UserProfile from "@/components/UserProfile";

// Khởi tạo Supabase Client an toàn
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://he-thong-dang-khoi-dong.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "key-khoi-dong";
const supabase = createClient(supabaseUrl, supabaseKey);

// 🚀 ĐÃ CẬP NHẬT DANH SÁCH MODEL MỚI NHẤT 2026
const AVAILABLE_MODELS = [
  { id: "gpt-5-mini", name: "GPT-5 Mini (Tốc độ ánh sáng - Tiết kiệm)" },
  { id: "gpt-5.4", name: "GPT-5.4 (Thông minh & Cân bằng - Khuyên dùng)" },
  { id: "gpt-5.4-pro", name: "GPT-5.4 Pro (Siêu trí tuệ - Tác vụ phức tạp)" },
];

type TopTab = "upload" | "dashboard" | "ai";

// Component mô phỏng giao diện điện thoại cực nhẹ, chống lỗi chồng chéo
const MobilePreview = ({ survey }: { survey: SurveyV2UI }) => {
  if (!survey) return null;
  return (
    <div className="bg-white min-h-full p-4 font-sans text-gray-800">
      <h2 className="text-xl font-bold text-indigo-600 mb-6 text-center leading-tight">
        {survey.title}
      </h2>
      <div className="space-y-5 pb-8">
        {survey.questions.map((q, idx) => (
          <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="font-bold text-sm mb-3 text-gray-800">
              <span className="text-indigo-500 mr-1 font-extrabold">Câu {idx + 1}:</span> {q.text}
            </p>
            {q.type !== "text" ? (
              <div className="space-y-2 mt-3">
                {q.options?.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                    <div className={`w-4 h-4 rounded-${q.type === 'multi_choice' ? 'sm' : 'full'} border-2 border-gray-300 flex-shrink-0`}></div>
                    <span className="text-sm text-gray-700">{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-20 bg-white border border-dashed border-gray-300 rounded-xl mt-3 p-3 text-xs text-gray-400 italic">
                Khu vực học sinh nhập câu trả lời...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [model, setModel] = useState("gpt-5.4");
  const [editingKey, setEditingKey] = useState(false);

  const [lessonText, setLessonText] = useState("");
  const [standardsText, setStandardsText] = useState("");
  const [subject, setSubject] = useState("Toán học");
  const [grade, setGrade] = useState("Lớp 10");
  
  // 🚀 ĐÃ THÊM BIẾN QUẢN LÝ TÊN LỚP VÀ TIẾT DẠY
  const [className, setClassName] = useState(""); 
  const [period, setPeriod] = useState("");

  const [processMode, setProcessMode] = useState<"standard" | "premium">("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [chip, setChip] = useState<string>("");
  const [survey, setSurvey] = useState<SurveyV2UI | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState("");
  const [useVisionParsing, setUseVisionParsing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const k = localStorage.getItem("edumirror_key") || "";
    if (k) setApiKey(k);
  }, []);

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
    setSelectedFile(f);
    setChip(`Đã chọn: ${f.name}`);
    setLessonText("");

    setLoading(true);
    try {
      if (useVisionParsing) {
        setLoadingStep("Đang tải file lên Supabase...");
        const fileExt = f.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lesson-plans')
          .upload(fileName, f);

        if (uploadError) throw new Error("Lỗi tải file lên Supabase: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('lesson-plans')
          .getPublicUrl(fileName);

        setLoadingStep("Đang dùng Vision AI quét công thức Toán (Xin chờ khoảng 10-20s)...");

        const aiRes = await fetch("/api/extractText-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: publicUrl, fileName: f.name })
        });

        const aiData = await aiRes.json();
        if (!aiRes.ok) throw new Error(aiData.error || "Lỗi AI LlamaParse");

        setLessonText(aiData.text);
      } else {
        setLoadingStep(`Đang đọc file: ${f.name}...`);
        const form = new FormData();
        form.append("file", f);
        const res = await fetch("/api/extractText", { method: "POST", body: form });
        const data = await res.json();
        setLessonText(data?.text || "");
      }

      setSurvey(null);
      setSurveyId(null);
      setQrUrl("");
    } catch (err: any) {
      console.warn("Lỗi xử lý file:", err);
      alert("Lỗi xử lý file: " + err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
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
        // 🚀 TRUYỀN THÊM className VÀ period XUỐNG API
        body: JSON.stringify({ model, content: lessonText, standards: standardsText, apiKey: saved, processMode, subject, className, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);

      setSurvey(data.survey_v2);
      setSurveyId(null);
      setQrUrl("");
    } catch (err: any) {
      alert("Lỗi Sinh Phiếu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!survey) return;
    setLoading(true);
    try {
      const saveRes = await fetch("/api/save-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: survey }),
      });
      const saveData = await saveRes.json();
      if (saveData.shortId) {
        setSurveyId(saveData.shortId);
        const currentDomain = window.location.origin;
        const surveyUrl = `${currentDomain}/survey?id=${saveData.shortId}`;
        const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`;
        setQrUrl(qr);
      }
    } catch (e: any) {
      alert("Lỗi lưu phiếu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQRInNewTab = () => {
    if (qrUrl) window.open(qrUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-gray-900 relative">
      {loading && <AILoading />}

      <header className="w-full bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* 1. LOGO (CỘT TRÁI) */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪞</span>
              <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                EduMirror X
              </div>
            </div>

            {/* 2. CỤM CHỨC NĂNG (CỘT PHẢI) */}
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              
              {/* Ô chọn AI Model */}
              <div className="flex items-center bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                <span className="pl-2 pr-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline-block">
                  AI Model:
                </span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-indigo-700 px-2 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-indigo-50 transition-colors"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô thông tin Giáo viên (User Profile) */}
              <div className="flex-shrink-0 z-50">
                <UserProfile />
              </div>

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
          {activeTab === "upload" && (
            <>
              <section className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      🔑
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">Kết nối AI cho tiết học</div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        Nhập API key 1 lần để hệ thống phân tích giáo án và tạo khảo sát.
                      </div>
                      {apiKey ? (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">✓ Đã sẵn sàng</span>
                          <span className="text-gray-400">(đã lưu ••••{apiKey.slice(-4)})</span>
                        </div>
                      ) : (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-semibold">⚠ Chưa thiết lập</span>
                          <span className="text-gray-400">(bạn có thể thiết lập sau)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!apiKey || editingKey ? (
                    <div className="flex items-center gap-2 md:pl-4">
                      <input
                        id="apiKeyInput"
                        type="password"
                        defaultValue={apiKey}
                        placeholder="Dán API key…"
                        className="outline-none px-3 py-2 text-sm w-[240px] md:w-[300px] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                      <button
                        onClick={() => { handleSaveKey(); setEditingKey(false); }}
                        className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-500 transition-colors"
                      >
                        Lưu
                      </button>
                      {apiKey && (
                        <button onClick={() => setEditingKey(false)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Hủy</button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 md:pl-4">
                      <button
                        onClick={() => setEditingKey(true)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
                      >
                        Cập nhật
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2"><span>👁️‍🗨️</span> Công nghệ Vision Parsing</h4>
                      <p className="text-xs text-indigo-600 mt-1">Bật để AI tự động đọc ảnh/PDF Toán học.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useVisionParsing} onChange={(e) => setUseVisionParsing(e.target.checked)}/>
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    {/* 🚀 ĐÃ CẬP NHẬT GIAO DIỆN CHỨA TÊN LỚP VÀ TIẾT */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">📄 Nội dung bài dạy</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none font-medium focus:border-indigo-500">
                          <option>Toán học</option><option>Vật lý</option><option>Ngữ văn</option><option>Tiếng Anh</option>
                        </select>
                        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none font-medium focus:border-indigo-500">
                          <option>Lớp 10</option><option>Lớp 11</option><option>Lớp 12</option>
                        </select>
                        
                        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div> 
                        
                        <input 
                          type="text" 
                          placeholder="Lớp (VD: 12A1)" 
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1.5 w-[100px] outline-none font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
                        />
                        <input 
                          type="text" 
                          placeholder="Tiết (VD: 3)" 
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                          className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1.5 w-[80px] outline-none font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
                        />
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
                          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                      🎯 Hệ quy chiếu / Chuẩn đầu ra
                    </h3>
                    <textarea
                      className="w-full h-24 p-4 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner"
                      placeholder="VD: Học sinh biết cách giải phương trình..."
                      value={standardsText}
                      onChange={(e) => setStandardsText(e.target.value)}
                    />
                    
                    {/* Hướng dẫn UX/UI */}
                    <p className="mt-2.5 text-[11px] text-indigo-600/80 italic leading-relaxed pl-1">
                      <span className="font-bold text-indigo-600">💡 Mẹo sư phạm:</span> Để AI phân tích sắc bén nhất, thầy/cô chỉ nên nhập từ <span className="font-bold">1 đến tối đa 3 trọng tâm</span> của tiết học. Nếu để trống, AI sẽ tự động quét toàn bộ giáo án.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-4">Trung tâm Tác vụ</h3>
                      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-800 rounded-xl border border-gray-700">
                        <button
                          onClick={() => setProcessMode("standard")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${processMode === "standard" ? "bg-gray-600 text-white shadow-md ring-1 ring-gray-400" : "text-gray-400 hover:text-gray-200"}`}
                        >
                          <span>🚀 Tốc độ</span><span className="text-[9px] font-normal opacity-70">Văn bản thường</span>
                        </button>
                        <button
                          onClick={() => setProcessMode("premium")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${processMode === "premium" ? "bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-lg shadow-orange-500/30 transform scale-105" : "text-gray-400 hover:text-gray-200"}`}
                        >
                          <span>💎 Cao cấp</span><span className="text-[9px] font-normal opacity-70">Toán/Lý/Hóa</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <button
                          onClick={handleGenerateSurvey}
                          disabled={loading}
                          className="w-full font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 py-4 rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? "⏳ Đang phân tích & Sinh phiếu..." : "✨ Sinh Phiếu Khảo sát"}
                        </button>
                        <button
                          onClick={() => { setLessonText(""); setStandardsText(""); setSurvey(null); setSelectedFile(null); setSurveyId(null); setQrUrl(""); setClassName(""); setPeriod(""); }}
                          className="w-full py-2 text-gray-500 text-xs hover:text-white underline"
                        >
                          Làm mới
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {survey && (
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-xl animate-fade-in-up mt-8">
                  <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-8 flex items-center gap-3 border-b pb-4">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">🛠️</span> Trạm Chỉnh Sửa Phiếu Khảo Sát
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="order-2 lg:order-1">
                       <SurveyEditor survey={survey} setSurvey={setSurvey} />
                    </div>
                    <div className="order-1 lg:order-2 flex flex-col items-center lg:border-l border-gray-100 lg:pl-10">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Xem trước Mobile
                      </h4>
                      <div className="border-[8px] border-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl transform scale-95 w-full max-w-[360px] bg-gray-50 h-[600px] overflow-y-auto custom-scrollbar relative">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                        <MobilePreview survey={survey} />
                      </div>
                      <div className="mt-8 w-full max-w-[360px]">
                        {qrUrl ? (
                          <div className="animate-fade-in text-center bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                            <div className="text-emerald-700 text-sm font-bold mb-4">✅ Đã xuất bản thành công!</div>
                            <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto border-4 border-white shadow-xl rounded-xl mb-4" />
                            <button onClick={handleOpenQRInNewTab} className="text-sm font-bold text-emerald-700 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                              Mở link trực tiếp ↗
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleSaveAndPublish}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2"
                          >
                            {loading ? "⏳ Đang lưu..." : "🚀 Chốt Phiếu & Tạo Mã QR"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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