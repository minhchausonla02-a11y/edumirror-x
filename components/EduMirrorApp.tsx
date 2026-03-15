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

const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Đa phương thức - Tốc độ chớp nhoáng)" },
  { id: "gpt-4.5", name: "GPT-4.5 (Hiểu ngữ cảnh sâu - Giảm ảo giác)" },
  { id: "gpt-5", name: "GPT-5 (Trí tuệ Nhân tạo Thế hệ mới)" },
  { id: "gpt-5.4", name: "GPT-5.4 (Trí tuệ Nhân tạo Lõi - Khuyên dùng)" }
];

const SUBJECTS = ["Toán học", "Vật lý", "Hóa học", "Sinh học", "Ngữ văn", "Tiếng Anh", "Lịch sử", "Địa lý", "GDCD", "Tin học"];

type TopTab = "upload" | "dashboard" | "ai";

const MobilePreview = ({ survey }: { survey: SurveyV2UI }) => {
  if (!survey) return null;
  return (
    <div className="bg-[#05050A] min-h-full p-4 font-sans text-gray-200">
      <h2 className="text-xl font-bold text-purple-400 mb-6 text-center leading-tight drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
        {survey.title}
      </h2>
      <div className="space-y-5 pb-8">
        {survey.questions.map((q, idx) => (
          <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
            <p className="font-bold text-sm mb-3 text-gray-100">
              <span className="text-purple-400 mr-1 font-extrabold">Câu {idx + 1}:</span> {q.text}
            </p>
            {q.type !== "text" ? (
              <div className="space-y-2 mt-3">
                {q.options?.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <div className={`w-4 h-4 rounded-${q.type === 'multi_choice' ? 'sm' : 'full'} border border-gray-500 flex-shrink-0`}></div>
                    <span className="text-sm text-gray-300">{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-20 bg-black/40 border border-dashed border-white/20 rounded-xl mt-3 p-3 text-xs text-gray-500 italic">
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
      const res = await fetch("/api/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-[#05050A] text-gray-300 font-sans relative selection:bg-purple-500/30 transition-colors duration-500">
      {loading && <AILoading />}

      {/* HEADER: Kính mờ sang trọng */}
      <header className="w-full bg-[#0A0A12]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
           {/* KHU VỰC LOGO: PHA LÊ & NEON (CODE MỚI) */}
            <div className="flex items-center gap-3 md:gap-4 cursor-pointer hover:scale-105 transition-transform duration-300">
              
              {/* Icon Khối Pha lê */}
              <div className="w-12 h-12 md:w-14 md:h-14 relative flex items-center justify-center rounded-xl bg-black/20 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                {/* Gọi file ảnh crystal-logo.png từ thư mục public */}
                <img 
                  src="/crystal-logo.png" 
                  alt="EduMirror Core" 
                  className="w-[120%] h-[120%] object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" 
                />
              </div>
              
              {/* Tên ứng dụng EduMirror X */}
              <div className="text-2xl md:text-3xl font-black tracking-widest flex items-baseline">
                <span className="text-glow-cyan">EduMirror</span>
                <span className="text-outline-neon ml-1 md:ml-2 text-3xl md:text-4xl">X</span>
              </div>

            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner backdrop-blur-sm">
                <span className="pl-3 pr-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:inline-block">
                  Core:
                </span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-purple-300 px-2 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-white/5 transition-colors [&>option]:bg-[#0A0A12] [&>option]:text-gray-300"
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

          {/* TABS NÂNG CẤP */}
          <div className="mt-6 flex gap-8 border-b border-white/5 relative">
            {[
              { id: "upload", label: "01. Soạn bài & Sinh phiếu" },
              { id: "dashboard", label: "02. Báo cáo Lớp học" },
              { id: "ai", label: "03. Tư vấn Sư phạm" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as TopTab)}
                className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all duration-300 border-b-2 relative ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {mounted ? (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
          {activeTab === "upload" && (
            <>
              {/* API KEY PANEL (Giữ nguyên) */}
              <section className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]">
                      🔑
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-200 tracking-wide">Kết nối AI cho tiết học</div>
                      <div className="text-xs text-gray-500 mt-1">Cấp quyền truy cập hệ thống phân tích lõi.</div>
                      {apiKey ? (
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
                          <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">● Sẵn sàng</span>
                          <span className="text-gray-500 font-mono">••••{apiKey.slice(-4)}</span>
                        </div>
                      ) : (
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
                          <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">⚠ Chờ cấp quyền</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!apiKey || editingKey ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="apiKeyInput"
                        type="password"
                        defaultValue={apiKey}
                        placeholder="Nhập khóa lượng tử..."
                        className="outline-none px-4 py-2 text-sm w-[240px] md:w-[300px] border border-white/10 rounded-xl bg-black/50 text-gray-200 focus:bg-black focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
                      />
                      <button onClick={() => { handleSaveKey(); setEditingKey(false); }} className="bg-purple-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-purple-500 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        Lưu
                      </button>
                      {apiKey && <button onClick={() => setEditingKey(false)} className="text-sm font-bold text-gray-500 hover:text-gray-300 px-3">Hủy</button>}
                    </div>
                  ) : (
                    <button onClick={() => setEditingKey(true)} className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-gray-300 hover:bg-white/10 transition-colors">
                      Đổi khóa
                    </button>
                  )}
                </div>
              </section>

              {/* KHÔNG GIAN BỐ CỤC MỚI: 1 CỘT (TOP-TO-BOTTOM FLOW) */}
              <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                
                {/* DÒNG 1: VISION AI & THÔNG TIN LỚP HỌC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vision AI */}
                  <div className="bg-blue-500/5 p-5 rounded-3xl border border-blue-500/20 flex items-center justify-between backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                    <div>
                      <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]"><span>👁️‍🗨️</span> Mắt thần Vision AI</h4>
                      <p className="text-[11px] text-blue-300/60 mt-1.5 uppercase tracking-wider">Quét công thức Toán/Lý/Hóa từ hình ảnh</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useVisionParsing} onChange={(e) => setUseVisionParsing(e.target.checked)}/>
                      <div className="w-12 h-6 bg-black/50 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
                    </label>
                  </div>

                  {/* Thông tin Lớp & Tiết */}
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/10 flex flex-col justify-center backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                     <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Định vị Không gian & Thời gian</h4>
                     <div className="flex items-center gap-3">
                        <input 
                          type="text" placeholder="Lớp (VD: 12A1)" value={className} onChange={(e) => setClassName(e.target.value)}
                          className="flex-1 bg-black/50 border border-white/10 text-sm rounded-xl px-4 py-2 outline-none font-mono text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 shadow-inner"
                        />
                        <span className="text-gray-600 font-bold">-</span>
                        <input 
                          type="text" placeholder="Tiết (VD: 3)" value={period} onChange={(e) => setPeriod(e.target.value)}
                          className="w-[100px] bg-black/50 border border-white/10 text-sm rounded-xl px-4 py-2 outline-none font-mono text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 shadow-inner text-center"
                        />
                     </div>
                  </div>
                </div>

                {/* DÒNG 2: NÚT CHỌN MÔN (TACTILE BUTTONS) */}
                <div className="bg-[#0A0A12]/80 p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
                   <h3 className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest mb-4">
                      <span className="text-purple-400">📚</span> Phân hệ Môn học
                   </h3>
                   <div className="flex flex-wrap gap-3">
                      {SUBJECTS.map((sub) => (
                         <button 
                            key={sub}
                            onClick={() => setSubject(sub)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border 
                                ${subject === sub 
                                   ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)] transform scale-105" 
                                   : "bg-black/50 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20 hover:bg-white/5"}`}
                         >
                            {sub}
                         </button>
                      ))}
                   </div>
                </div>

                {/* DÒNG 3: MA TRẬN NHẬP LIỆU BÀI DẠY (MATRIX GRID) */}
                <div className="bg-white/5 p-1.5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md relative">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                   
                   <div className="bg-[#05050A] rounded-[1.3rem] overflow-hidden relative border border-white/5">
                      {/* Grid Overlay Matrix Effect */}
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                      
                      {/* Tiêu đề góc */}
                      <div className="absolute top-4 left-5 pointer-events-none">
                         <span className="bg-black/80 px-3 py-1 rounded border border-white/10 text-[10px] font-mono text-purple-400 tracking-widest uppercase shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                            [ RADAR QUÉT VĂN BẢN ]
                         </span>
                      </div>

                      <textarea
                        className="relative z-10 w-full h-[400px] bg-transparent text-sm text-purple-50 placeholder:text-gray-600/50 p-6 pt-14 focus:outline-none focus:ring-inset focus:ring-1 focus:ring-purple-500/30 transition-all resize-none leading-relaxed font-mono custom-scrollbar"
                        placeholder="Dán nội dung giáo án vào khu vực này để tiến hành đồng bộ..."
                        value={lessonText}
                        onChange={(e) => setLessonText(e.target.value)}
                      />
                      
                      <div className="absolute bottom-5 right-5 z-20">
                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/10 text-gray-200 text-xs font-bold px-5 py-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex items-center gap-2 transition-all backdrop-blur-md group">
                          <span className="text-lg group-hover:animate-bounce">📁</span> Tải Tệp Lên
                          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                   </div>
                </div>

                {/* DÒNG 4: HỆ QUY CHIẾU (TARGETING) */}
                <div className="bg-gradient-to-br from-purple-900/20 to-black p-6 rounded-3xl border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]">
                  <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                    🎯 Thiết lập Chuẩn đầu ra (Targeting)
                  </h3>
                  <textarea
                    className="w-full h-24 p-4 rounded-xl border border-purple-500/30 bg-black/60 text-sm text-gray-300 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none shadow-inner"
                    placeholder="VD: Học sinh nắm được khái niệm tích phân (Nhập từ 1-3 mục tiêu cốt lõi)..."
                    value={standardsText}
                    onChange={(e) => setStandardsText(e.target.value)}
                  />
                </div>

                {/* DÒNG 5: TRUNG TÂM TÁC VỤ (NUCLEAR COMMAND) - TRÀN BOTTOM */}
                <div className="bg-[#0D0D18] p-8 rounded-[2rem] border border-purple-500/30 shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden mt-10">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-purple-600/10 to-blue-600/10 blur-3xl z-0 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    
                    {/* Select Mode */}
                    <div className="flex-shrink-0 w-full md:w-auto">
                       <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center md:text-left">Động cơ Xử lý</h3>
                       <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                          <button onClick={() => setProcessMode("standard")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${processMode === "standard" ? "bg-white/10 text-white shadow-md" : "text-gray-500 hover:text-gray-300"}`}>
                            <span>🚀</span> Tốc độ
                          </button>
                          <button onClick={() => setProcessMode("premium")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${processMode === "premium" ? "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                            <span>💎</span> Cao cấp
                          </button>
                       </div>
                    </div>

                    {/* BIG NUCLEAR BUTTON */}
                    <div className="flex-1 w-full flex flex-col items-center">
                      <button
                        onClick={handleGenerateSurvey}
                        disabled={loading}
                        className="w-full max-w-md font-extrabold text-lg tracking-widest uppercase bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 hover:from-purple-500 hover:via-indigo-400 hover:to-blue-500 text-white py-5 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.5)] transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-3 border border-white/20"
                      >
                        {loading ? <span className="animate-pulse">⏳ ĐANG KÍCH HOẠT HỆ THỐNG...</span> : "✨ KHỞI TẠO PHIẾU KHẢO SÁT"}
                      </button>
                      <button onClick={() => { setLessonText(""); setStandardsText(""); setSurvey(null); setSelectedFile(null); setSurveyId(null); setQrUrl(""); setClassName(""); setPeriod(""); }} className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors border-b border-transparent hover:border-gray-500 pb-0.5">
                        [ Hủy lệnh & Làm mới ]
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* TRẠM CHỈNH SỬA & PREVIEW (Giữ nguyên như trước) */}
              {survey && (
                <div className="bg-[#0A0A12]/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.1)] animate-fade-in-up max-w-6xl mx-auto mt-12">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-200 mb-8 flex items-center gap-3 border-b border-white/10 pb-4 tracking-wide">
                    <span className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">🛠️</span> Trạm hiệu chỉnh Dữ liệu
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="order-2 lg:order-1">
                       <SurveyEditor survey={survey} setSurvey={setSurvey} />
                    </div>
                    <div className="order-1 lg:order-2 flex flex-col items-center lg:border-l border-white/5 lg:pl-10">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span> Preview Khách
                      </h4>
                      <div className="border-[8px] border-black rounded-[2.5rem] overflow-hidden shadow-2xl transform scale-95 w-full max-w-[360px] bg-[#05050A] h-[600px] overflow-y-auto custom-scrollbar relative">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
                        <MobilePreview survey={survey} />
                      </div>
                      <div className="mt-8 w-full max-w-[360px]">
                        {qrUrl ? (
                          <div className="animate-fade-in text-center bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30">
                            <div className="text-emerald-400 text-sm font-bold mb-4 uppercase tracking-widest drop-shadow-[0_0_5px_#10b981]">✅ Truyền dẫn thành công</div>
                            <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto border-4 border-white rounded-xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                            <button onClick={handleOpenQRInNewTab} className="text-xs font-bold text-black bg-emerald-400 px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:bg-emerald-300 transition-all uppercase tracking-wider">
                              Mở kết nối ↗
                            </button>
                          </div>
                        ) : (
                          <button onClick={handleSaveAndPublish} disabled={loading} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black rounded-xl text-sm font-extrabold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2">
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
    <Suspense fallback={<div className="min-h-screen bg-[#05050A] flex items-center justify-center text-purple-500">Khởi động hệ thống...</div>}>
      <EduMirrorContent />
    </Suspense>
  );
}