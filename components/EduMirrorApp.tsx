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

// 🚀 NÂNG CẤP THẲNG LÊN THẾ HỆ GEMINI 2.5 MỚI NHẤT CỦA GOOGLE
const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Đa phương thức - Tốc độ chớp nhoáng)" },
  { id: "gpt-4.5", name: "GPT-4.5 (Hiểu ngữ cảnh sâu - Giảm ảo giác)" },
  { id: "gpt-5", name: "GPT-5 (Trí tuệ Nhân tạo Thế hệ mới)" },
  { id: "gpt-5.4", name: "GPT-5.4 (Trí tuệ Nhân tạo Lõi - Khuyên dùng)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Hệ sinh thái Google - Khuyên dùng)" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Xử lý siêu tốc)" }
];

const SUBJECTS = ["Toán học", "Vật lý", "Hóa học", "Sinh học", "Ngữ văn", "Tiếng Anh", "Lịch sử", "Địa lý", "GDCD", "Tin học"];

type TopTab = "upload" | "dashboard" | "ai";

const MobilePreview = ({ survey }: { survey: SurveyV2UI }) => {
  if (!survey) return null;
  return (
    <div className="bg-[#091128] min-h-full p-4 font-sans text-white border-x border-[#1c3664]">
      <h2 className="text-lg font-bold text-[#00e5ff] mb-6 text-center leading-tight drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
        {survey.title}
      </h2>
      <div className="space-y-5 pb-8">
        {survey.questions.map((q, idx) => (
          <div key={idx} className="bg-[#12254a]/60 backdrop-blur-sm p-4 rounded-2xl border border-[#1c3664] shadow-sm">
            <p className="font-bold text-sm mb-3 text-white">
              <span className="text-[#00e5ff] mr-1 font-extrabold drop-shadow-md">Câu {idx + 1}:</span> {q.text}
            </p>
            {q.type !== "text" ? (
              <div className="space-y-2 mt-3">
                {q.options?.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3 bg-[#040b16]/50 p-2.5 rounded-xl border border-[#1c3664]/50">
                    <div className={`w-4 h-4 rounded-${q.type === 'multi_choice' ? 'sm' : 'full'} border border-[#00e5ff]/50 flex-shrink-0 bg-transparent`}></div>
                    <span className="text-sm text-[#8b9bc0]">{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-20 bg-[#040b16]/50 border border-dashed border-[#1c3664] rounded-xl mt-3 p-3 text-xs text-[#8b9bc0] italic">
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

  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState(""); // 🚀 STATE LƯU KEY GEMINI
  const [model, setModel] = useState("gpt-5.4");
  const [editingKey, setEditingKey] = useState(false);

  const [lessonText, setLessonText] = useState("");
  const [standardsText, setStandardsText] = useState("");
  const [subject, setSubject] = useState("Toán học");
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

  // 🚀 TẢI CẢ 2 KEY LÊN KHI MỞ APP
  useEffect(() => {
    setMounted(true);
    const k = localStorage.getItem("edumirror_key") || "";
    const gk = localStorage.getItem("edumirror_gemini_key") || "";
    if (k) setApiKey(k);
    if (gk) setGeminiKey(gk);
  }, []);

  // 🚀 LƯU ĐÚNG KEY CHO ĐÚNG MODEL
  const handleSaveKey = () => {
    const inp = document.getElementById("apiKeyInput") as HTMLInputElement;
    const v = inp.value.trim();
    if (model.startsWith("gemini")) {
      localStorage.setItem("edumirror_gemini_key", v);
      setGeminiKey(v);
      alert("✅ Đã lưu khóa bảo mật Google Gemini");
    } else {
      localStorage.setItem("edumirror_key", v);
      setApiKey(v);
      alert("✅ Đã lưu khóa bảo mật OpenAI");
    }
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

        const { data: uploadData, error: uploadError } = await supabase.storage.from('lesson-plans').upload(fileName, f);
        if (uploadError) throw new Error("Lỗi tải file lên Supabase: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage.from('lesson-plans').getPublicUrl(fileName);

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
      const savedGemini = localStorage.getItem("edumirror_gemini_key") || "";
      
      const res = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🚀 GỬI CẢ 2 KEY XUỐNG BACKEND
        body: JSON.stringify({ model, content: lessonText, standards: standardsText, apiKey: saved, geminiKey: savedGemini, processMode, subject, className, period }),
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
    <div className="min-h-screen bg-transparent text-white font-sans relative transition-colors duration-500">
      {loading && <AILoading />}

      {/* HEADER: Nền tối kính mờ */}
      <header className="w-full bg-[#040b16]/80 backdrop-blur-xl border-b border-[#1c3664] sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* LOGO KHU VỰC */}
            <div className="flex items-center gap-3 md:gap-4 cursor-pointer hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 md:w-14 md:h-14 relative flex items-center justify-center rounded-xl bg-[#12254a]/50 border border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <img 
                  src="/crystal-logo.png" 
                  alt="EduMirror Core" 
                  className="w-[100%] h-[100%] object-contain neon-icon" 
                />
              </div>
              <div className="text-2xl md:text-3xl font-black tracking-widest flex items-baseline">
                <span className="text-glow-cyan">EduMirror</span>
                <span className="text-outline-neon ml-1 md:ml-2 text-3xl md:text-4xl">X</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <div className="flex items-center bg-[#12254a]/40 p-1 rounded-xl border border-[#1c3664] shadow-inner">
                <span className="pl-3 pr-2 text-[10px] font-bold text-[#8b9bc0] uppercase tracking-widest hidden sm:inline-block">
                  Core:
                </span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#00e5ff] px-2 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-[#1c3664]/50 transition-colors [&>option]:bg-[#091128] [&>option]:text-white"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-shrink-0 z-50">
                <UserProfile />
              </div>
            </div>
          </div>

          {/* TABS NÂNG CẤP (CYBERPUNK STYLE) */}
          <div className="mt-6 flex gap-8 border-b border-[#1c3664] relative">
            {[
              { id: "upload", label: "01. SOẠN BÀI & SINH PHIẾU" },
              { id: "dashboard", label: "02. BÁO CÁO LỚP HỌC" },
              { id: "ai", label: "03. TƯ VẤN SƯ PHẠM" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as TopTab)}
                className={`pb-4 text-sm font-bold tracking-wider transition-all duration-300 border-b-2 relative ${
                  activeTab === tab.id
                    ? "border-[#00e5ff] text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                    : "border-transparent text-[#8b9bc0] hover:text-[#00e5ff]/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {mounted ? (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
          {activeTab === "upload" && (
            <>
              {/* 🚀 API KEY PANEL: ADAPTIVE UI CHO GEMINI VÀ OPENAI */}
              <section className={`backdrop-blur-md p-5 rounded-2xl border shadow-[0_4px_20px_rgba(0,0,0,0.3)] max-w-5xl mx-auto transition-all duration-500
                  ${model.startsWith("gemini") 
                      ? "bg-[#1a1235]/60 border-[#b100ff]/50 hover:shadow-[0_0_20px_rgba(177,0,255,0.2)]" 
                      : "bg-[#12254a]/40 border-[#1c3664] hover:shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:border-[#00e5ff]/40"}`}>
                
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 h-10 w-10 rounded-xl bg-[#040b16] flex items-center justify-center border shadow-inner text-lg transition-colors
                        ${model.startsWith("gemini") ? "border-[#b100ff]/50 text-[#b100ff] shadow-[inset_0_0_10px_rgba(177,0,255,0.3)]" : "border-[#00e5ff]/30 text-[#00e5ff] shadow-[inset_0_0_10px_rgba(0,229,255,0.2)]"}`}>
                      {model.startsWith("gemini") ? "✨" : "🔑"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-wide drop-shadow-sm">
                        {model.startsWith("gemini") ? "Kết nối Google Gemini" : "Kết nối OpenAI Core"}
                      </div>
                      <div className="text-xs text-[#8b9bc0] mt-1">Cấp quyền truy cập hệ thống phân tích lõi.</div>
                      
                      {/* Hiển thị trạng thái */}
                      {(model.startsWith("gemini") ? geminiKey : apiKey) ? (
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
                          <span className={`px-2 py-1 rounded-md font-bold ai-breathing border transition-colors
                              ${model.startsWith("gemini") ? "bg-[#b100ff]/10 text-[#d8b4fe] border-[#b100ff]/40" : "bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30"}`}>
                            ● Sẵn sàng
                          </span>
                          <span className="text-[#8b9bc0] font-mono">
                            ••••{(model.startsWith("gemini") ? geminiKey : apiKey).slice(-4)}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
                          <span className="px-2 py-1 rounded-md bg-[#ff003c]/10 text-[#ff003c] border border-[#ff003c]/30 font-bold drop-shadow-[0_0_5px_rgba(255,0,60,0.5)]">⚠ Chờ cấp quyền</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Khu vực Nhập Input */}
                  {!(model.startsWith("gemini") ? geminiKey : apiKey) || editingKey ? (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <input
                        id="apiKeyInput"
                        type="password"
                        defaultValue={model.startsWith("gemini") ? geminiKey : apiKey}
                        placeholder={model.startsWith("gemini") ? "Nhập mã Google AI Studio..." : "Nhập mã OpenAI API..."}
                        className={`outline-none px-4 py-2 text-sm w-[240px] md:w-[300px] border rounded-xl bg-[#040b16] text-white focus:ring-1 transition-all font-mono shadow-inner
                            ${model.startsWith("gemini") ? "border-[#b100ff]/50 focus:border-[#b100ff] focus:ring-[#b100ff]/50" : "border-[#1c3664] focus:border-[#00e5ff] focus:ring-[#00e5ff]/50"}`}
                      />
                      <button onClick={() => { handleSaveKey(); setEditingKey(false); }} 
                              className={`bg-transparent border text-sm font-bold px-5 py-2 rounded-xl transition-all uppercase tracking-wider
                                  ${model.startsWith("gemini") ? "border-[#b100ff] text-[#d8b4fe] hover:bg-[#b100ff] hover:text-white shadow-[0_0_10px_rgba(177,0,255,0.2)]" : "border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#040b16] shadow-[0_0_10px_rgba(0,229,255,0.2)]"}`}>
                        Lưu
                      </button>
                      {(model.startsWith("gemini") ? geminiKey : apiKey) && (
                        <button onClick={() => setEditingKey(false)} className="text-[11px] font-bold text-[#8b9bc0] hover:text-[#ff003c] uppercase tracking-widest px-3 transition-colors">Hủy</button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => setEditingKey(true)} 
                            className={`px-5 py-2 rounded-xl border bg-[#040b16] text-sm font-bold text-[#8b9bc0] hover:text-white transition-colors uppercase tracking-wider
                                ${model.startsWith("gemini") ? "border-[#b100ff]/40 hover:border-[#b100ff] hover:shadow-[0_0_10px_rgba(177,0,255,0.3)]" : "border-[#1c3664] hover:border-[#00e5ff] hover:shadow-[0_0_10px_rgba(0,229,255,0.3)]"}`}>
                      Đổi khóa
                    </button>
                  )}
                </div>
              </section>

              {/* KHÔNG GIAN BỐ CỤC: 1 CỘT (TOP-TO-BOTTOM FLOW) */}
              <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                
                {/* DÒNG 1: VISION AI & THÔNG TIN LỚP HỌC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vision AI */}
                  <div className="bg-[#12254a]/40 backdrop-blur-md p-5 rounded-3xl border border-[#1c3664] flex items-center justify-between shadow-sm hover:border-[#00e5ff]/30 transition-colors">
                    <div>
                      <h4 className="text-sm font-bold text-[#00e5ff] flex items-center gap-2"><span>👁️‍🗨️</span> Mắt thần Vision AI</h4>
                      <p className="text-[11px] text-[#8b9bc0] mt-1.5 uppercase tracking-wider">Quét công thức Toán/Lý/Hóa từ hình ảnh</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useVisionParsing} onChange={(e) => setUseVisionParsing(e.target.checked)}/>
                      <div className="w-12 h-6 bg-[#091128] border border-[#1c3664] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff] shadow-inner"></div>
                    </label>
                  </div>

                  {/* Thông tin Lớp & Tiết */}
                  <div className="bg-[#12254a]/40 backdrop-blur-md p-5 rounded-3xl border border-[#1c3664] flex flex-col justify-center shadow-sm hover:border-[#00e5ff]/30 transition-colors">
                     <h4 className="text-[11px] font-bold text-[#8b9bc0] uppercase tracking-widest mb-3">Định vị Không gian & Thời gian</h4>
                     <div className="flex items-center gap-3">
                        <input 
                          type="text" placeholder="Lớp (VD: 12A1)" value={className} onChange={(e) => setClassName(e.target.value)}
                          className="flex-1 bg-[#091128] border border-[#1c3664] text-sm rounded-xl px-4 py-2 outline-none font-mono text-white focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/30 transition-all placeholder:text-[#8b9bc0]"
                        />
                        <span className="text-[#8b9bc0] font-bold">-</span>
                        <input 
                          type="text" placeholder="Tiết (VD: 3)" value={period} onChange={(e) => setPeriod(e.target.value)}
                          className="w-[100px] bg-[#091128] border border-[#1c3664] text-sm rounded-xl px-4 py-2 outline-none font-mono text-white focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/30 transition-all placeholder:text-[#8b9bc0] text-center"
                        />
                     </div>
                  </div>
                </div>

                {/* DÒNG 2: NÚT CHỌN MÔN */}
                <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm">
                   <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-widest mb-4">
                      <span className="text-[#00e5ff]">📚</span> Phân hệ Môn học
                   </h3>
                   <div className="flex flex-wrap gap-3">
                      {SUBJECTS.map((sub) => (
                         <button 
                            key={sub}
                            onClick={() => setSubject(sub)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border 
                                ${subject === sub 
                                   ? "bg-transparent border-[#00e5ff] text-[#00e5ff] shadow-[inset_0_0_10px_rgba(0,229,255,0.2),_0_0_10px_rgba(0,229,255,0.3)] transform scale-105" 
                                   : "bg-[#091128] border-[#1c3664] text-[#8b9bc0] hover:text-white hover:border-[#00e5ff]/50"}`}
                         >
                            {sub}
                         </button>
                      ))}
                   </div>
                </div>

                {/* DÒNG 3: MA TRẬN NHẬP LIỆU BÀI DẠY (RADAR SCANNER) */}
                <div className="bg-[#12254a]/40 backdrop-blur-md p-2 rounded-3xl border border-[#1c3664] shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
                   <div className="bg-[#040b16] rounded-[1.3rem] overflow-hidden relative border border-[#1c3664]">
                      {/* Grid Overlay cho giao diện Sci-Fi */}
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                      
                      {/* Tiêu đề góc */}
                      <div className="absolute top-4 left-5 pointer-events-none z-20">
                         <span className="bg-[#091128] px-3 py-1 rounded border border-[#00e5ff]/50 text-[10px] font-mono text-[#00e5ff] tracking-widest uppercase shadow-[0_0_8px_rgba(0,229,255,0.3)]">
                            [ RADAR QUÉT VĂN BẢN ]
                         </span>
                      </div>

                      <textarea
                        className="relative z-10 w-full h-[400px] bg-transparent text-sm text-white placeholder:text-[#8b9bc0] p-6 pt-16 focus:outline-none focus:bg-[#12254a]/30 transition-all resize-none leading-relaxed font-mono custom-scrollbar"
                        placeholder="Dán nội dung giáo án vào khu vực này để tiến hành đồng bộ..."
                        value={lessonText}
                        onChange={(e) => setLessonText(e.target.value)}
                      />
                      
                      <div className="absolute bottom-5 right-5 z-20">
                        <label className="cursor-pointer bg-[#091128] hover:bg-[#1c3664] border border-[#00e5ff]/50 text-[#00e5ff] text-xs font-bold px-5 py-3 rounded-xl shadow-[0_0_10px_rgba(0,229,255,0.2)] flex items-center gap-2 transition-all group">
                          <span className="text-lg group-hover:-translate-y-1 transition-transform">📁</span> Tải Tệp Lên
                          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                   </div>
                </div>

                {/* DÒNG 4: HỆ QUY CHIẾU (TARGETING) */}
                <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-[0_0_15px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-[#00e5ff]/50 transition-all">
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                  <div className="relative z-10">
                      <h3 className="text-sm font-bold text-[#00e5ff] mb-3 flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">
                        🎯 Thiết lập Chuẩn đầu ra (Targeting)
                      </h3>
                      
                      <div className="mb-4 bg-[#040b16]/80 border-l-2 border-[#00e5ff] p-3 rounded-r-lg shadow-inner">
                         <p className="text-[11px] font-mono text-[#8b9bc0] leading-relaxed">
                            <span className="text-[#00e5ff] font-bold drop-shadow-[0_0_2px_#00e5ff]">[ SYSTEM GUIDE ]</span> Thiết lập hệ tọa độ mục tiêu để Lõi AI tối ưu hóa độ chính xác:
                            <br/>
                            <span className="text-[#00ff9d] mr-1.5 mt-1 inline-block">▸</span> Cung cấp 1-3 trọng tâm kiến thức/kỹ năng lõi.
                            <br/>
                            <span className="text-[#00ff9d] mr-1.5 mt-1 inline-block">▸</span> Thuật toán sẽ dùng dữ liệu này làm mỏ neo để sinh các câu hỏi trắc nghiệm đánh giá bám sát năng lực thực tế.
                         </p>
                      </div>

                      <textarea
                        className="w-full h-24 p-4 rounded-xl border border-[#1c3664] bg-[#091128]/80 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] outline-none transition-all resize-none shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#8b9bc0]/40 font-mono custom-scrollbar"
                        placeholder="[ Đang chờ tọa độ mục tiêu... Cú pháp đề xuất: <Động từ năng lực> + <Kiến thức lõi>. VD: Vận dụng tích phân để tính diện tích. ]"
                        value={standardsText}
                        onChange={(e) => setStandardsText(e.target.value)}
                      />
                  </div>
                </div>

                {/* DÒNG 5: TRUNG TÂM TÁC VỤ */}
                <div className="bg-[#12254a]/40 backdrop-blur-xl p-8 rounded-[2rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.05)] relative overflow-hidden mt-10">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    
                    {/* Select Mode */}
                    <div className="flex-shrink-0 w-full md:w-auto">
                       <h3 className="text-[10px] font-bold text-[#8b9bc0] uppercase tracking-widest mb-3 text-center md:text-left">Động cơ Xử lý</h3>
                       <div className="flex bg-[#091128] p-1.5 rounded-2xl border border-[#1c3664] shadow-inner">
                          <button onClick={() => setProcessMode("standard")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${processMode === "standard" ? "bg-transparent text-[#00e5ff] shadow-[inset_0_0_8px_rgba(0,229,255,0.3)] border border-[#00e5ff]" : "text-[#8b9bc0] hover:text-white border border-transparent"}`}>
                            <span>🚀</span> Tốc độ
                          </button>
                          <button onClick={() => setProcessMode("premium")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${processMode === "premium" ? "bg-transparent border border-[#00e5ff] text-[#00e5ff] shadow-[inset_0_0_8px_rgba(0,229,255,0.3)]" : "text-[#8b9bc0] hover:text-white border border-transparent"}`}>
                            <span>💎</span> Cao cấp
                          </button>
                       </div>
                    </div>

                    {/* BIG NUCLEAR BUTTON */}
                    <div className="flex-1 w-full flex flex-col items-center">
                      <button
                        onClick={handleGenerateSurvey}
                        disabled={loading}
                        className="w-full max-w-md font-extrabold text-lg tracking-widest uppercase bg-gradient-to-r from-[#00e5ff] to-[#2196f3] text-[#040b16] py-5 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.5)] transform transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,229,255,0.8)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-3"
                      >
                        {loading ? <span className="animate-pulse">⏳ ĐANG KÍCH HOẠT HỆ THỐNG...</span> : "✨ KHỞI TẠO PHIẾU KHẢO SÁT"}
                      </button>
                      <button onClick={() => { setLessonText(""); setStandardsText(""); setSurvey(null); setSelectedFile(null); setSurveyId(null); setQrUrl(""); setClassName(""); setPeriod(""); }} className="mt-4 text-[10px] text-[#8b9bc0] uppercase tracking-widest hover:text-[#00e5ff] hover:drop-shadow-[0_0_5px_#00e5ff] transition-all">
                        [ Hủy lệnh & Làm mới ]
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* TRẠM CHỈNH SỬA & PREVIEW */}
              {survey && (
                <div className="bg-[#12254a]/40 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.1)] animate-fade-in-up max-w-6xl mx-auto mt-12">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-8 flex items-center gap-3 border-b border-[#1c3664] pb-4 tracking-wide">
                    <span className="text-[#00e5ff]">🛠️</span> Trạm hiệu chỉnh Dữ liệu
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="order-2 lg:order-1">
                       <SurveyEditor survey={survey} setSurvey={setSurvey} />
                    </div>
                    <div className="order-1 lg:order-2 flex flex-col items-center lg:border-l border-[#1c3664] lg:pl-10">
                      <h4 className="text-xs font-bold text-[#8b9bc0] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff] animate-pulse"></span> Preview Khách
                      </h4>
                      <div className="border-[8px] border-[#091128] rounded-[2.5rem] overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] transform scale-95 w-full max-w-[360px] bg-[#091128] h-[600px] overflow-y-auto custom-scrollbar relative">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-[#091128] rounded-b-xl z-20 border-b border-x border-[#1c3664]"></div>
                        <MobilePreview survey={survey} />
                      </div>
                      <div className="mt-8 w-full max-w-[360px]">
                        {qrUrl ? (
                          <div className="animate-fade-in text-center bg-[#091128] p-6 rounded-2xl border border-[#00e5ff]/50 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                            <div className="text-[#00e5ff] text-sm font-bold mb-4 uppercase tracking-widest">✅ Truyền dẫn thành công</div>
                            <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto border-4 border-[#040b16] rounded-xl mb-4 shadow-md" />
                            <button onClick={handleOpenQRInNewTab} className="text-xs font-bold text-[#040b16] bg-[#00e5ff] px-5 py-2.5 rounded-xl shadow-[0_0_10px_rgba(0,229,255,0.5)] hover:bg-white transition-all uppercase tracking-wider">
                              Mở kết nối ↗
                            </button>
                          </div>
                        ) : (
                          <button onClick={handleSaveAndPublish} disabled={loading} className="w-full py-4 bg-transparent border-2 border-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#040b16] text-[#00e5ff] rounded-xl text-sm font-extrabold uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex justify-center items-center gap-2">
                            {loading ? "⏳ Đang mã hóa..." : "🚀 Xuất bản & Tạo QR"}
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
            <section className="animate-fade-in">
              <DashboardView model={model} />
            </section>
          )}

          {activeTab === "ai" && (
            <section className="animate-fade-in">
              {/* 🚀 ĐẨY CẢ GEMINI KEY XUỐNG CHO TRANG BÁO CÁO SƯ PHẠM */}
              <AISuggestionsView lessonText={lessonText} apiKey={apiKey} geminiKey={geminiKey} model={model} />
            </section>
          )}
        </main>
      ) : null}
    </div>
  );
}

export default function EduMirrorApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#091128] flex items-center justify-center text-[#00e5ff] drop-shadow-[0_0_8px_#00e5ff] font-bold">Khởi động hệ thống lõi...</div>}>
      <EduMirrorContent />
    </Suspense>
  );
}