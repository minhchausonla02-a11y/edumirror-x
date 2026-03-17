"use client";
import { useState, useEffect } from "react";
// 🚀 NÂNG CẤP 1: Import hệ thống điều hướng không tải lại trang của Next.js
import { useRouter } from "next/navigation";

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-xs text-[#8b9bc0] italic text-center py-6 bg-[#040b16]/50 rounded-2xl border border-dashed border-[#1c3664]">{msg}</div>;
}

const formatSurveyDate = (dateString: string) => {
  const d = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const extractSubject = (typeStr?: string) => {
  if (!typeStr) return "";
  if (typeStr.startsWith("edumirror_")) {
      const subj = typeStr.replace("edumirror_", "");
      return subj === "standard" ? "" : subj;
  }
  return "";
};

const findQuestionTitle = (obj: any, targetKey: string): string | null => {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
      for (let item of obj) {
          let res = findQuestionTitle(item, targetKey);
          if (res) return res;
      }
  } else {
      if (obj.id === targetKey || obj.name === targetKey || obj.key === targetKey) {
          return obj.title || obj.label || obj.question || obj.text || targetKey;
      }
      for (let k in obj) {
          let res = findQuestionTitle(obj[k], targetKey);
          if (res) return res;
      }
  }
  return null;
};

export default function DashboardView({ model }: { model?: string }) {
  // 🚀 NÂNG CẤP 2: Khởi tạo Router
  const router = useRouter();

  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [surveyPayload, setSurveyPayload] = useState<any>(null); 
  const [loading, setLoading] = useState(false);
  
  // 🚀 STATE QUẢN LÝ LUÂN CHUYỂN DỮ LIỆU (HUMAN-IN-THE-LOOP)
  const [editableFeedbacks, setEditableFeedbacks] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingLabels, setIsSavingLabels] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showRaw, setShowRaw] = useState(false); 
  const [showTrash, setShowTrash] = useState(false); 

  const fetchSurveys = () => {
    fetch("/api/list-surveys")
      .then((res) => res.json())
      .then((data) => {
        if (data.surveys && data.surveys.length > 0) {
          setSurveys(data.surveys);
          if (!selectedId || !data.surveys.find((s:any) => s.short_id === selectedId)) {
              setSelectedId(data.surveys[0].short_id);
          }
        } else {
            setSurveys([]);
            setSelectedId("");
            setStats(null);
            setSurveyPayload(null);
        }
      })
      .catch(err => console.error("Lỗi tải danh sách:", err));
  };

  useEffect(() => { fetchSurveys(); }, []);

  const fetchStats = () => {
    if (!selectedId) return;
    setLoading(true);
    setAiResult(null);
    setShowRaw(false); 
    setShowTrash(false);
    
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
         if (data.stats) {
             setStats(data.stats);
             setSurveyPayload(data.surveyPayload); 
             
             const normalized = (data.stats.feedbacks || []).map((fb: any) => {
                 if (typeof fb === 'string') return { raw_text: fb, is_sos: false, is_spam: false, is_harsh: false };
                 return { ...fb };
             });
             setEditableFeedbacks(normalized);
             setHasUnsavedChanges(false);
         } else {
             setStats(null);
             setSurveyPayload(null);
             setEditableFeedbacks([]);
         }
      })
      .catch(err => console.error("Lỗi tải stats:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedId]);

  const handleMoveFeedback = (textToMove: string, targetLabel: 'normal' | 'sos' | 'spam') => {
      const updated = editableFeedbacks.map(fb => {
          if (fb.raw_text === textToMove) {
              return {
                  ...fb,
                  is_sos: targetLabel === 'sos',
                  is_spam: targetLabel === 'spam'
              };
          }
          return fb;
      });
      setEditableFeedbacks(updated);
      setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
      setIsSavingLabels(true);
      await new Promise(r => setTimeout(r, 800)); 
      setHasUnsavedChanges(false);
      setIsSavingLabels(false);
  };

  const analyzeFeedback = async () => {
    setAnalyzing(true);
    try {
        const savedKey = localStorage.getItem("edumirror_key");
        const normalFeedbacks = editableFeedbacks.filter(fb => !fb.is_sos && !fb.is_spam);
        const textArray = normalFeedbacks.map(fb => fb.raw_text);
        
        if (textArray.length === 0) {
            alert("Không có phản hồi hợp lệ nào để AI phân tích.");
            setAnalyzing(false);
            return;
        }

        const res = await fetch("/api/analyze-feedback", {
            method: "POST",
            body: JSON.stringify({ feedbacks: textArray, apiKey: savedKey, model: model })
        });
        const data = await res.json();
        if (Array.isArray(data.result)) setAiResult(data.result);
        else alert("AI trả về dữ liệu lỗi.");
    } catch (e) { alert("Lỗi kết nối AI."); } 
    finally { setAnalyzing(false); }
  };

  const goToSolution = () => {
    if (!aiResult) return;
    const problemText = aiResult.map((item: any) => `- ${item.category}: ${item.summary}`).join("\n");
    localStorage.setItem("current_diagnosis", problemText);
    localStorage.setItem("current_stats", JSON.stringify(stats));
    
    // 🚀 NÂNG CẤP 3: Sử dụng router.push để chuyển tab mượt mà
    router.push("/?tab=ai&mode=solve");
  };

  const handleDelete = async () => {
      if (!selectedId) return;
      if (!confirm("⚠️ CẢNH BÁO TỐI CAO: Bạn có chắc chắn muốn xóa vĩnh viễn dữ liệu này khỏi Lõi?")) return;
      setDeleting(true);
      try {
          const res = await fetch(`/api/delete-survey?id=${selectedId}`, { method: "DELETE" });
          if (res.ok) { alert("Đã tiêu hủy dữ liệu thành công!"); fetchSurveys(); } 
          else { alert("Lỗi khi xóa phiếu."); }
      } catch (e) { alert("Lỗi kết nối server."); } 
      finally { setDeleting(false); }
  };

  // 🚀 Đã nâng cấp Progress Bar thành Thanh Năng Lượng (Energy Bar)
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    
    return (
      <div className="mb-4 group">
        <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-[#8b9bc0] uppercase tracking-wide">
          <span className="truncate max-w-[80%] text-white drop-shadow-md" title={label}>{label}</span>
          <span className="text-[#00e5ff] font-mono drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]">{val || 0} <span className="text-[#8b9bc0]">({pct}%)</span></span>
        </div>
        <div className="w-full bg-[#040b16] rounded-full h-2 overflow-hidden border border-[#1c3664] shadow-inner">
          <div className={`h-2 rounded-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const showData = !!stats;
  const sosFeedbacks = editableFeedbacks.filter((fb: any) => fb.is_sos && !fb.is_spam);
  const spamFeedbacks = editableFeedbacks.filter((fb: any) => fb.is_spam);
  const normalFeedbacks = editableFeedbacks.filter((fb: any) => !fb.is_sos && !fb.is_spam);
  const currentSurvey = surveys.find(s => s.short_id === selectedId);
  const currentSubject = currentSurvey ? extractSubject(currentSurvey.payload?.type) : "";

  return (
    <div className="space-y-8 font-sans text-white animate-fade-in pb-12 max-w-7xl mx-auto">
      
      {/* HEADER COMMAND BAR */}
      <div className="bg-[#12254a]/40 backdrop-blur-md p-5 rounded-3xl border border-[#1c3664] shadow-[0_0_20px_rgba(0,229,255,0.05)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
               <span className="text-[#00e5ff]">📊</span> Báo cáo lớp học
            </h2>
            {currentSubject && (
              <span className="bg-[#091128] text-[#00e5ff] border border-[#00e5ff]/50 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                {currentSubject}
              </span>
            )}
          </div>
          <p className="text-sm text-[#8b9bc0] font-mono mt-1">{stats ? `Mẫu thu thập: ${stats.total} biến số` : "Đang chờ chỉ định tệp dữ liệu..."}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto items-center">
            {surveys.length > 0 ? (
            <>
                <select 
                    className="flex-1 p-3 border rounded-xl text-sm min-w-[300px] max-w-[450px] bg-[#091128] text-[#00e5ff] border-[#1c3664] font-mono outline-none cursor-pointer focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/50 shadow-inner [&>option]:bg-[#040b16] [&>option]:text-white"
                    value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                >
                    {surveys.map(s => {
                      const subj = extractSubject(s.payload?.type);
                      const prefix = subj ? `[${subj}] ` : "";
                      const title = s.payload?.title ? s.payload.title.substring(0, 45) : "Phiếu khảo sát";
                      return (
                        <option key={s.short_id} value={s.short_id}>
                            {prefix}{title} ({formatSurveyDate(s.created_at)})
                        </option>
                      );
                    })}
                </select>
                <button onClick={fetchStats} className="p-3 bg-transparent text-[#00e5ff] rounded-xl hover:bg-[#00e5ff] hover:text-[#040b16] border border-[#00e5ff]/50 transition-all shadow-[0_0_10px_rgba(0,229,255,0.1)]" title="Đồng bộ lại">🔄</button>
                <button onClick={handleDelete} disabled={deleting} className="p-3 bg-transparent text-[#ff003c] rounded-xl hover:bg-[#ff003c] hover:text-white border border-[#ff003c]/50 transition-all shadow-[0_0_10px_rgba(255,0,60,0.1)]" title="Tiêu hủy tệp">{deleting ? "..." : "🗑️"}</button>
            </>
            ) : <div className="text-amber-400 text-sm p-2 font-mono bg-amber-500/10 rounded-lg border border-amber-500/30">Chưa có tệp dữ liệu nào trong kho.</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32"><p className="text-sm font-mono text-[#00e5ff] animate-pulse tracking-widest uppercase drop-shadow-[0_0_8px_#00e5ff]">Đang nạp dữ liệu từ máy chủ...</p></div>
      ) : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* HERO CARD - TỔNG PHIẾU */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-[#12254a]/60 backdrop-blur-xl border border-[#00e5ff]/30 p-8 rounded-3xl shadow-[0_0_20px_rgba(0,229,255,0.1)] flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
             {/* Hiệu ứng ánh sáng nền Hero */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#00e5ff]/10 rounded-full blur-[80px] pointer-events-none"></div>

             <div className="relative z-10 flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-[2px] border-[#00e5ff] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.5),inset_0_0_15px_rgba(0,229,255,0.3)] bg-[#040b16]">
                   <div className="text-4xl font-extrabold text-[#00e5ff] drop-shadow-[0_0_8px_#00e5ff]">{stats.total || 0}</div>
                </div>
                <div>
                   <div className="text-sm text-white uppercase font-bold tracking-widest mb-1 drop-shadow-md">Mật độ Dữ liệu</div>
                   <div className="text-xs text-[#8b9bc0] font-mono">Trạng thái: <span className={`font-bold ${stats.total > 20 ? "text-[#00ff9d] drop-shadow-[0_0_5px_#00ff9d]" : "text-amber-400 drop-shadow-[0_0_5px_#fbbf24]"}`}>{stats.total > 20 ? 'Ổn định' : 'Thiếu hụt'}</span></div>
                </div>
             </div>
             
             <div className="relative z-10 text-right mt-6 sm:mt-0 flex flex-col items-end">
                <div className="text-[10px] text-[#8b9bc0] uppercase font-bold tracking-widest mb-3">Chỉ số Cảm xúc Cao nhất</div>
                <div className="text-2xl font-bold bg-[#040b16] border border-[#00e5ff]/50 px-6 py-3 rounded-2xl shadow-[0_0_15px_rgba(0,229,255,0.2)] text-[#00e5ff] drop-shadow-[0_0_8px_#00e5ff]">
                  {stats.feeling && Object.keys(stats.feeling).length > 0 ? Object.entries(stats.feeling).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] : "Chưa xác định"}
                </div>
             </div>
          </div>

          {/* CHARTS CARDS */}
          <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm relative overflow-hidden group transition-all hover:border-[#ff00ff]/50 hover:shadow-[0_0_20px_rgba(255,0,255,0.15)]">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm drop-shadow-md"><span className="text-[#ff00ff] text-lg drop-shadow-[0_0_8px_#ff00ff]">🎭</span> Cảm xúc</h3>
            {stats.feeling && Object.keys(stats.feeling).length > 0 ? 
                Object.entries(stats.feeling).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-[#ff00ff]" />) 
                : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm relative overflow-hidden group transition-all hover:border-[#00ff9d]/50 hover:shadow-[0_0_20px_rgba(0,255,157,0.15)]">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm drop-shadow-md"><span className="text-[#00ff9d] text-lg drop-shadow-[0_0_8px_#00ff9d]">🧠</span> Mức độ hiểu</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding)
                  .sort((a:any, b:any) => a[0].localeCompare(b[0]))
                  .map(([k, v]: any) => {
                      const code = k.split(" ")[0].split("–")[0].trim();
                      const labelMap: Record<string, string> = { "B1": "Chưa hiểu (Mất gốc)", "B2": "Mơ hồ (Cần xem lại)", "B3": "Hiểu sơ (Cơ bản)", "B4": "Hiểu rõ (Tự tin)" };
                      const colorMap: Record<string, string> = { "B1": "bg-[#ff003c]", "B2": "bg-amber-400", "B3": "bg-[#00e5ff]", "B4": "bg-[#00ff9d]" };
                      return <ProgressBar key={k} label={labelMap[code] || k} val={v} total={stats.total} color={colorMap[code] || "bg-[#8b9bc0]"} />;
                  })
            ) : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          {/* Điểm Nghẽn (Báo Đỏ) */}
          <div className="bg-[#ff003c]/10 backdrop-blur-md p-6 rounded-3xl border border-[#ff003c]/30 shadow-[0_0_15px_rgba(255,0,60,0.1)] relative overflow-hidden row-span-2 group">
            <h3 className="font-bold text-[#ff003c] mb-6 flex items-center gap-2 relative z-10 uppercase tracking-wide text-sm drop-shadow-[0_0_5px_#ff003c]"><span className="text-xl">⚠️</span> Điểm nghẽn</h3>
            <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.difficulties && Object.keys(stats.difficulties).length > 0 ? 
                Object.entries(stats.difficulties).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-[#091128] p-3 rounded-xl border border-[#ff003c]/50 shadow-sm transition-colors">
                    <span className="text-[12px] font-medium text-white leading-relaxed max-w-[80%] drop-shadow-sm">{k}</span>
                    <span className="text-xs font-bold bg-[#ff003c]/20 text-[#ff003c] border border-[#ff003c]/50 px-2.5 py-1 rounded-lg font-mono drop-shadow-[0_0_5px_#ff003c]">{v}</span>
                  </div>
                )) 
              : <div className="text-center py-10 text-[#00ff9d] text-xs font-bold tracking-wider uppercase border border-dashed border-[#00ff9d]/50 rounded-xl bg-[#00ff9d]/10 drop-shadow-[0_0_5px_#00ff9d]">Hệ thống an toàn. Không có điểm nghẽn.</div>}
            </div>
          </div>

          <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm relative overflow-hidden group transition-all hover:border-[#00e5ff]/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm drop-shadow-md"><span className="text-[#00e5ff] text-lg drop-shadow-[0_0_8px_#00e5ff]">💡</span> Mong muốn</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.adjustments && Object.keys(stats.adjustments).length > 0 ? 
                  Object.entries(stats.adjustments).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-[#00e5ff]" />)
                  : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
            </div>
          </div>

          <div className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm relative overflow-hidden group transition-all hover:border-[#b100ff]/50 hover:shadow-[0_0_20px_rgba(177,0,255,0.15)]">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm drop-shadow-md"><span className="text-[#b100ff] text-lg drop-shadow-[0_0_8px_#b100ff]">🎨</span> Phong cách học</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.styles && Object.keys(stats.styles).length > 0 ? 
                  Object.entries(stats.styles).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-[#b100ff]" />)
                  : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
            </div>
          </div>

          {/* KHẢO SÁT BỔ SUNG */}
          {stats?.custom_charts && Object.keys(stats.custom_charts).length > 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
                <div className="flex items-center gap-3 mb-6 px-2">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide drop-shadow-md">
                      <span className="text-amber-400 drop-shadow-[0_0_8px_#fbbf24]">⚡</span> Khảo sát tùy chọn
                   </h3>
                   <div className="flex-1 h-px bg-gradient-to-r from-[#1c3664] to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(stats.custom_charts).map(([qKey, chartData]: any) => {
                        let parsedPayload = surveyPayload;
                        if (typeof surveyPayload === 'string') { try { parsedPayload = JSON.parse(surveyPayload); } catch(e){} }
                        let qTitle = findQuestionTitle(parsedPayload, qKey) || qKey;
                        
                        return (
                          <div key={qKey} className="bg-[#12254a]/40 backdrop-blur-md p-6 rounded-3xl border border-[#1c3664] shadow-sm relative overflow-hidden group hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all">
                              <h4 className="font-bold text-white mb-6 text-sm leading-relaxed border-b border-[#1c3664] pb-3 drop-shadow-sm">{qTitle}</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                  {Object.keys(chartData).length > 0 ? (
                                      Object.entries(chartData)
                                        .sort((a:any, b:any) => b[1] - a[1]) 
                                        .map(([optKey, count]: any) => (
                                          <ProgressBar key={optKey} label={optKey} val={count} total={stats.total} color="bg-amber-400" />
                                      ))
                                  ) : <EmptyState msg="Chưa có dữ liệu" />}
                              </div>
                          </div>
                        )
                    })}
                </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* KHU VỰC NLP AI & LỜI NHẮN (HUMAN-IN-THE-LOOP) */}
          {/* ========================================================= */}
          <div className="bg-[#12254a]/40 backdrop-blur-xl p-6 lg:p-8 rounded-[2rem] border border-[#00e5ff]/30 shadow-[0_0_30px_rgba(0,229,255,0.1)] col-span-1 md:col-span-2 lg:col-span-3 mt-4 relative overflow-hidden">
            
            {/* THANH ĐIỀU KHIỂN & XÁC NHẬN */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-[#091128]/80 backdrop-blur-md p-5 rounded-2xl border border-[#1c3664] shadow-inner">
                <div className="flex flex-col">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    <span className="text-xl text-[#00e5ff] drop-shadow-[0_0_8px_#00e5ff]">🧠</span> Trạm Huấn Luyện AI
                  </h3>
                  <p className="text-[11px] text-[#8b9bc0] mt-2 font-mono">Hiệu chỉnh nhãn dán thủ công để tối ưu hóa thuật toán NLP.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {hasUnsavedChanges && (
                        <span className="text-[10px] font-bold text-amber-400 animate-pulse flex items-center gap-1 uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/50 drop-shadow-[0_0_5px_#fbbf24]">
                            ⚠️ Cần đồng bộ
                        </span>
                    )}
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={!hasUnsavedChanges || isSavingLabels}
                        className={`text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider
                            ${hasUnsavedChanges 
                                ? "bg-transparent border border-amber-400 text-amber-400 shadow-[inset_0_0_10px_rgba(251,191,36,0.3),_0_0_10px_rgba(251,191,36,0.3)] hover:bg-amber-400 hover:text-[#040b16]" 
                                : "bg-[#040b16] text-[#1c3664] border border-[#1c3664] cursor-not-allowed"}`}
                    >
                        {isSavingLabels ? "⏳ ĐANG GHI NHỚ..." : "💾 ĐỒNG BỘ DATA"}
                    </button>
                    
                    <button 
                        onClick={analyzeFeedback} 
                        disabled={analyzing || hasUnsavedChanges} 
                        className={`text-xs text-[#040b16] px-6 py-3 rounded-xl transition-all font-extrabold tracking-widest flex items-center gap-2 uppercase
                            ${hasUnsavedChanges 
                                ? "bg-[#1c3664] text-[#8b9bc0] cursor-not-allowed border border-[#1c3664]" 
                                : "bg-gradient-to-r from-[#00e5ff] to-[#2196f3] shadow-[0_0_15px_rgba(0,229,255,0.5)] hover:shadow-[0_0_25px_rgba(0,229,255,0.8)] border border-[#00e5ff]"}`}
                    >
                        {analyzing ? "⏳ ĐANG PHÂN TÍCH..." : "✨ KÍCH HOẠT AI NLP"}
                    </button>
                </div>
            </div>

          {/* KẾT QUẢ AI PHÂN TÍCH */}
            {aiResult && (
                <div className="mb-10 bg-[#091128] rounded-2xl border border-[#00e5ff]/50 overflow-hidden animate-fade-in shadow-[0_0_20px_rgba(0,229,255,0.15)] relative">
                    <div className="p-4 bg-[#12254a]/80 flex justify-between items-center border-b border-[#00e5ff]/30 backdrop-blur-md">
                        <span className="text-[11px] font-bold text-[#00e5ff] uppercase tracking-widest flex items-center gap-2 ml-2 drop-shadow-[0_0_5px_#00e5ff]">
                            🤖 BÁO CÁO PHÂN TÍCH KHỐI NHÓM (NLP)
                        </span>
                        <button onClick={goToSolution} className="text-[11px] bg-[#00e5ff] hover:bg-white text-[#040b16] border border-[#00e5ff] px-4 py-2 rounded-lg font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)] transition-all uppercase tracking-wider">
                            💡 TƯ VẤN SƯ PHẠM →
                        </button>
                    </div>
                    
                    {/* KHU VỰC HIỂN THỊ GOM NHÓM */}
                    <div className="p-6 grid gap-6 grid-cols-1 md:grid-cols-2">
                        {Object.entries(
                            aiResult.reduce((acc: any, item: any) => {
                                if (!acc[item.category]) acc[item.category] = { items: [], totalCount: 0 };
                                acc[item.category].items.push(item);
                                acc[item.category].totalCount += (item.count || 1);
                                return acc;
                            }, {})
                        ).map(([category, group]: [string, any], idx: number) => (
                            <div key={idx} className="bg-[#12254a]/40 backdrop-blur-sm border border-[#1c3664] rounded-xl p-5 shadow-sm hover:border-[#00e5ff]/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all flex flex-col">
                                
                                <div className="flex items-center justify-between border-b border-[#1c3664] pb-3 mb-4">
                                    <span className="px-3 py-1 bg-[#091128] text-[#00e5ff] text-[10px] font-bold rounded border border-[#00e5ff]/30 uppercase tracking-widest drop-shadow-sm">
                                        {category}
                                    </span>
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/50 font-bold text-xs" title="Tổng số phiếu">
                                        {group.totalCount}
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {group.items.map((item: any, i: number) => {
                                        let colorClass = "text-amber-400"; 
                                        let bgClass = "bg-amber-500/10";
                                        let borderClass = "border-amber-500/30";
                                        let icon = "▶"; 

                                        if (item.type === 'positive') {
                                            colorClass = "text-[#00ff9d]"; 
                                            bgClass = "bg-[#00ff9d]/10";
                                            borderClass = "border-[#00ff9d]/30";
                                            icon = "✓";
                                        } else if (item.type === 'negative') {
                                            colorClass = "text-[#ff003c]"; 
                                            bgClass = "bg-[#ff003c]/10";
                                            borderClass = "border-[#ff003c]/30";
                                            icon = "⚠";
                                        }

                                        return (
                                            <li key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${borderClass} ${bgClass} transition-colors backdrop-blur-sm`}>
                                                <span className={`mt-0.5 text-xs font-black ${colorClass} drop-shadow-[0_0_5px_currentColor]`}>
                                                    {icon}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-[13px] text-white leading-relaxed font-medium drop-shadow-sm">
                                                        {item.summary}
                                                        {item.count > 1 && (
                                                            <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${borderClass} ${colorClass} bg-[#040b16] inline-block shadow-inner`}>
                                                                {item.count} phiếu
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 1. KHU VỰC SOS */}
            {sosFeedbacks.length > 0 && (
              <div className="mb-8 bg-[#ff003c]/10 border border-[#ff003c]/50 rounded-2xl shadow-[0_0_20px_rgba(255,0,60,0.15)] overflow-hidden backdrop-blur-sm">
                <details className="group" open>
                  <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-[#ff003c]/20 transition-colors list-none outline-none">
                     <h4 className="text-[#ff003c] font-bold flex items-center gap-3 text-xs uppercase tracking-widest drop-shadow-[0_0_8px_#ff003c]">
                       <span className="text-xl">🚨</span> CẢNH BÁO AN TOÀN CẤP 1 ({sosFeedbacks.length})
                     </h4>
                     <span className="text-[#ff003c] font-bold group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  
                  <div className="p-4 pt-0 space-y-3 bg-transparent">
                    {sosFeedbacks.map((fb: any, idx: number) => (
                      <div key={idx} className="bg-[#040b16] rounded-xl border border-[#ff003c]/40 shadow-inner flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 gap-4">
                        <div className="text-white text-sm font-medium italic border-l-4 border-[#ff003c] pl-4 flex-1 leading-relaxed drop-shadow-sm">
                          "{fb.raw_text}"
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[10px] font-bold bg-transparent hover:bg-[#00ff9d]/20 text-[#00ff9d] border-[#00ff9d]/50 px-3 py-2 rounded-lg border transition-all uppercase tracking-wider shadow-[0_0_8px_rgba(0,255,157,0.2)]">
                                🔙 Khôi phục
                            </button>
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[10px] font-bold bg-transparent hover:bg-white/10 text-[#8b9bc0] px-3 py-2 rounded-lg border border-[#1c3664] transition-all uppercase tracking-wider">
                                🗑️ Bỏ rác
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* 2. KHU VỰC LỜI NHẮN HỢP LỆ */}
            <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border-b border-[#1c3664] pb-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-widest drop-shadow-sm">
                    <span className="text-[#00e5ff] drop-shadow-[0_0_8px_#00e5ff]">💌</span> Lời nhắn hợp lệ ({normalFeedbacks.length})
                  </h3>
                  <div className="flex items-center gap-3 bg-[#091128] px-4 py-2 rounded-full border border-[#1c3664] shadow-inner">
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${showRaw ? 'text-[#ff003c] drop-shadow-[0_0_5px_#ff003c]' : 'text-[#8b9bc0]'}`}>
                      {showRaw ? '👁️ HIỆN BẢN GỐC' : '🛡️ ĐÃ CHE MỜ (SAFE)'}
                    </span>
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none border border-[#1c3664] ${showRaw ? 'bg-[#ff003c] shadow-[0_0_10px_#ff003c]' : 'bg-[#00ff9d] shadow-[0_0_10px_#00ff9d]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#040b16] transition-transform ${showRaw ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-2">
                  {normalFeedbacks.length > 0 ? normalFeedbacks.map((fb: any, i: number) => {
                      const isHarsh = fb.is_harsh;
                      let textToDisplay = (isHarsh && !showRaw) ? "Nội dung nhạy cảm đã bị ẩn. Bật Raw Mode để xem." : fb.raw_text;
                      const isHiddenHarsh = isHarsh && !showRaw;

                      return (
                        <div key={i} className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl transition-all duration-300 border relative overflow-hidden backdrop-blur-md
                            ${isHiddenHarsh ? 'bg-[#040b16] border-[#1c3664] border-dashed text-[#8b9bc0]' : 'bg-[#12254a]/40 border-[#1c3664] text-white hover:border-[#00e5ff]/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.1)]'}
                        `}>
                            <div className="relative z-10 flex-1 pl-2 border-l-2 border-transparent group-hover:border-[#00e5ff] transition-colors">
                                {isHiddenHarsh && <span className="mr-3 inline-block bg-[#1c3664] text-[#8b9bc0] px-2 py-0.5 rounded text-[9px] font-mono tracking-widest not-italic border border-[#8b9bc0]/30">🔒 ENCRYPTED</span>}
                                <span className={`leading-relaxed ${isHiddenHarsh ? 'italic font-mono text-[11px]' : 'font-medium text-[13px] drop-shadow-sm'}`}>
                                    {isHiddenHarsh ? textToDisplay : `"${textToDisplay}"`}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 shrink-0 sm:pl-4">
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold text-[#ff003c] bg-[#040b16] hover:bg-[#ff003c]/20 border border-[#ff003c]/50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest shadow-[0_0_8px_rgba(255,0,60,0.2)]">
                                    🚨 SOS
                                </button>
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[9px] font-bold text-[#8b9bc0] bg-[#040b16] hover:bg-white/10 border border-[#1c3664] px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest shadow-sm">
                                    🗑️ Xóa
                                </button>
                            </div>
                        </div>
                      );
                  }) : <EmptyState msg="Kho lưu trữ trống." />}
                </div>
            </div>

            {/* 3. KHU VỰC THÙNG RÁC AI */}
            {spamFeedbacks.length > 0 && (
                <div className="mt-8 border-t border-[#1c3664] pt-6">
                    <button 
                        onClick={() => setShowTrash(!showTrash)} 
                        className="text-[11px] text-[#8b9bc0] hover:text-white hover:border-[#00e5ff]/50 flex items-center gap-2 font-bold transition-colors uppercase tracking-widest bg-[#091128] px-4 py-2 rounded-lg border border-[#1c3664]"
                    >
                        🗑️ THÙNG RÁC AI ĐÃ LỌC ({spamFeedbacks.length}) {showTrash ? "▲" : "▼"}
                    </button>
                    
                    {showTrash && (
                        <div className="mt-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-4 bg-[#040b16] rounded-2xl border border-[#1c3664] shadow-inner">
                            {spamFeedbacks.map((fb: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row justify-between md:items-center bg-[#12254a]/30 p-3.5 rounded-xl border border-[#1c3664] gap-4">
                                    <div className="text-[#8b9bc0] text-[11px] italic pr-2 flex-1 line-through decoration-[#1c3664] font-mono">
                                        <span className="font-bold text-[#ff003c] mr-3 not-italic bg-[#ff003c]/10 px-1.5 py-0.5 rounded border border-[#ff003c]/30 drop-shadow-[0_0_5px_#ff003c]">BLOCKED</span>
                                        {fb.raw_text}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[9px] font-bold bg-[#040b16] text-[#00ff9d] hover:bg-[#00ff9d]/20 border border-[#00ff9d]/50 px-3 py-1.5 rounded-lg transition-colors shadow-[0_0_8px_rgba(0,255,157,0.2)] uppercase tracking-wider">
                                            ✅ Khôi phục
                                        </button>
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold bg-[#040b16] text-[#ff003c] hover:bg-[#ff003c]/20 border border-[#ff003c]/50 px-3 py-1.5 rounded-lg transition-colors shadow-[0_0_8px_rgba(255,0,60,0.2)] uppercase tracking-wider">
                                            🚨 SOS
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

          </div>

        </div>
      ) : (
        <div className="text-center py-32 bg-[#12254a]/40 backdrop-blur-xl rounded-[3rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.05)]">
            <div className="text-6xl opacity-30 mb-6 drop-shadow-[0_0_10px_#00e5ff]">📭</div>
            <h3 className="text-xl font-bold text-[#8b9bc0] tracking-widest uppercase drop-shadow-sm">Lõi Dữ Liệu Trống</h3>
            <p className="text-xs text-[#1c3664] mt-3 font-mono">Vui lòng chọn một mã định danh từ Command Bar phía trên để trích xuất.</p>
        </div>
      )}
    </div>
  );
}