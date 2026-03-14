"use client";
import { useState, useEffect } from "react";

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-xs text-gray-500 italic text-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">{msg}</div>;
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
    window.location.href = "/?tab=ai&mode=solve";
  };

  const handleDelete = async () => {
      if (!selectedId) return;
      if (!confirm("⚠️ CẢNH BÁO LƯỢNG TỬ: Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi dữ liệu này?")) return;
      setDeleting(true);
      try {
          const res = await fetch(`/api/delete-survey?id=${selectedId}`, { method: "DELETE" });
          if (res.ok) { alert("Đã xóa dữ liệu thành công!"); fetchSurveys(); } 
          else { alert("Lỗi khi xóa phiếu."); }
      } catch (e) { alert("Lỗi kết nối server."); } 
      finally { setDeleting(false); }
  };

  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    const neonShadow = color.includes('pink') ? 'shadow-[0_0_8px_#ec4899]' 
                     : color.includes('emerald') ? 'shadow-[0_0_8px_#10b981]' 
                     : color.includes('blue') ? 'shadow-[0_0_8px_#3b82f6]'
                     : color.includes('purple') ? 'shadow-[0_0_8px_#a855f7]'
                     : color.includes('red') ? 'shadow-[0_0_8px_#ef4444]'
                     : color.includes('amber') ? 'shadow-[0_0_8px_#f59e0b]'
                     : '';

    return (
      <div className="mb-4 group">
        <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-gray-400 uppercase tracking-wide">
          <span className="truncate max-w-[80%] text-gray-300" title={label}>{label}</span>
          <span className="text-gray-100 font-mono">{val || 0} <span className="opacity-50">({pct}%)</span></span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div className={`h-1.5 rounded-full ${color} ${neonShadow} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }}></div>
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
    <div className="space-y-8 font-sans text-gray-200 animate-fade-in pb-12 max-w-7xl mx-auto">
      
      {/* HEADER COMMAND BAR */}
      <div className="bg-[#0A0A12]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 tracking-wide uppercase">
               <span className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">📊</span> Báo cáo lớp học
            </h2>
            {currentSubject && (
              <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]">
                {currentSubject}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-mono mt-1">{stats ? `Mẫu thu thập: ${stats.total} biến số` : "Đang chờ chỉ định tệp dữ liệu..."}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto items-center">
            {surveys.length > 0 ? (
            <>
                <select 
                    className="flex-1 p-3 border rounded-xl text-sm min-w-[300px] max-w-[450px] bg-[#05050A] text-gray-200 border-white/10 font-mono outline-none cursor-pointer focus:ring-1 focus:ring-purple-500/50 shadow-inner [&>option]:bg-[#0D0D18]"
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
                <button onClick={fetchStats} className="p-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 border border-white/10 transition-colors" title="Đồng bộ lại">🔄</button>
                <button onClick={handleDelete} disabled={deleting} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 border border-red-500/20 transition-colors" title="Tiêu hủy tệp">{deleting ? "..." : "🗑️"}</button>
            </>
            ) : <div className="text-amber-500 text-sm p-2 font-mono">Chưa có tệp dữ liệu nào trong kho.</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32"><p className="text-sm font-mono text-purple-500 animate-pulse tracking-widest uppercase">Đang nạp dữ liệu từ máy chủ...</p></div>
      ) : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* HERO CARD - TỔNG PHIẾU */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-purple-900/40 to-[#05050A] border border-purple-500/30 p-8 rounded-3xl shadow-[inset_0_0_30px_rgba(168,85,247,0.1)] flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
             <div className="relative z-10 flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-[6px] border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] bg-[#05050A]">
                   <div className="text-5xl font-extrabold text-white drop-shadow-[0_0_15px_#a855f7]">{stats.total || 0}</div>
                </div>
                <div>
                   <div className="text-sm text-purple-300 uppercase font-bold tracking-widest mb-1">Mật độ Dữ liệu</div>
                   <div className="text-xs text-gray-400 font-mono">Trạng thái: <span className={stats.total > 20 ? "text-emerald-400" : "text-amber-400"}>{stats.total > 20 ? 'Ổn định' : 'Thiếu hụt'}</span></div>
                </div>
             </div>
             
             <div className="relative z-10 text-right mt-6 sm:mt-0 flex flex-col items-end">
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3">Chỉ số Cảm xúc Cao nhất</div>
                <div className="text-2xl font-bold bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md inline-block shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                  {stats.feeling && Object.keys(stats.feeling).length > 0 ? Object.entries(stats.feeling).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] : "Chưa xác định"}
                </div>
             </div>
             <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
          </div>

          {/* CHARTS CARDS */}
          <div className="bg-[#0D0D18] p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all hover:border-pink-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500 opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#ec4899]"></div>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-pink-400 drop-shadow-[0_0_5px_#ec4899] text-lg">🎭</span> Cảm xúc</h3>
            {stats.feeling && Object.keys(stats.feeling).length > 0 ? 
                Object.entries(stats.feeling).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />) 
                : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          <div className="bg-[#0D0D18] p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all hover:border-emerald-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#10b981]"></div>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-emerald-400 drop-shadow-[0_0_5px_#10b981] text-lg">🧠</span> Mức độ hiểu</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding)
                  .sort((a:any, b:any) => a[0].localeCompare(b[0]))
                  .map(([k, v]: any) => {
                      const code = k.split(" ")[0].split("–")[0].trim();
                      const labelMap: Record<string, string> = { "B1": "Chưa hiểu (Mất gốc)", "B2": "Mơ hồ (Cần xem lại)", "B3": "Hiểu sơ (Cơ bản)", "B4": "Hiểu rõ (Tự tin)" };
                      const colorMap: Record<string, string> = { "B1": "bg-red-500", "B2": "bg-orange-400", "B3": "bg-blue-400", "B4": "bg-emerald-500" };
                      return <ProgressBar key={k} label={labelMap[code] || k} val={v} total={stats.total} color={colorMap[code] || "bg-gray-400"} />;
                  })
            ) : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          <div className="bg-red-950/10 p-6 rounded-3xl border border-red-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden row-span-2 group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_15px_#ef4444]"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <h3 className="font-bold text-red-400 mb-6 flex items-center gap-2 relative z-10 uppercase tracking-wide text-sm"><span className="text-xl drop-shadow-[0_0_5px_#ef4444]">⚠️</span> Điểm nghẽn</h3>
            <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.difficulties && Object.keys(stats.difficulties).length > 0 ? 
                Object.entries(stats.difficulties).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-[#05050A] p-3 rounded-xl border border-red-500/30 hover:bg-red-500/10 transition-colors shadow-inner">
                    <span className="text-[11px] font-medium text-gray-300 leading-relaxed max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 px-2.5 py-1 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.2)] font-mono">{v}</span>
                  </div>
                )) 
              : <div className="text-center py-10 text-emerald-500 text-xs font-bold tracking-wider uppercase border border-dashed border-emerald-500/30 rounded-xl bg-emerald-500/5">Hệ thống an toàn. Không có điểm nghẽn.</div>}
            </div>
          </div>

          <div className="bg-[#0D0D18] p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all hover:border-blue-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#3b82f6]"></div>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-blue-400 drop-shadow-[0_0_5px_#3b82f6] text-lg">💡</span> Mong muốn</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.adjustments && Object.keys(stats.adjustments).length > 0 ? 
                  Object.entries(stats.adjustments).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-blue-500" />)
                  : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
            </div>
          </div>

          <div className="bg-[#0D0D18] p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all hover:border-purple-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-fuchsia-400 opacity-30 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#a855f7]"></div>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-purple-400 drop-shadow-[0_0_5px_#a855f7] text-lg">🎨</span> Phong cách học</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.styles && Object.keys(stats.styles).length > 0 ? 
                  Object.entries(stats.styles).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-purple-500" />)
                  : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
            </div>
          </div>

          {/* KHẢO SÁT BỔ SUNG */}
          {stats?.custom_charts && Object.keys(stats.custom_charts).length > 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
                <div className="flex items-center gap-3 mb-6 px-2">
                   <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                      <span className="text-amber-400 drop-shadow-[0_0_8px_#f59e0b]">⚡</span> Khảo sát tùy chọn
                   </h3>
                   <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(stats.custom_charts).map(([qKey, chartData]: any) => {
                        let parsedPayload = surveyPayload;
                        if (typeof surveyPayload === 'string') { try { parsedPayload = JSON.parse(surveyPayload); } catch(e){} }
                        let qTitle = findQuestionTitle(parsedPayload, qKey) || qKey;
                        
                        return (
                          <div key={qKey} className="bg-[#0D0D18] p-6 rounded-3xl border border-amber-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-bl-full -z-10 blur-xl"></div>
                              <h4 className="font-bold text-gray-200 mb-6 text-sm leading-relaxed border-b border-white/5 pb-3">{qTitle}</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                  {Object.keys(chartData).length > 0 ? (
                                      Object.entries(chartData)
                                        .sort((a:any, b:any) => b[1] - a[1]) 
                                        .map(([optKey, count]: any) => (
                                          <ProgressBar key={optKey} label={optKey} val={count} total={stats.total} color="bg-amber-500" />
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
          <div className="bg-[#0A0A12] p-6 lg:p-8 rounded-[2rem] border border-purple-500/20 shadow-[0_10px_50px_rgba(0,0,0,0.6)] col-span-1 md:col-span-2 lg:col-span-3 mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-purple-600/5 to-blue-600/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

            {/* THANH ĐIỀU KHIỂN & XÁC NHẬN */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-[#05050A] p-5 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2 uppercase tracking-widest">
                    <span className="text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">🧠</span> Trạm Huấn Luyện AI
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-2 font-mono">Hiệu chỉnh nhãn dán thủ công để tối ưu hóa thuật toán NLP.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {hasUnsavedChanges && (
                        <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1 drop-shadow-[0_0_5px_#f59e0b] uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            ⚠️ Cần đồng bộ
                        </span>
                    )}
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={!hasUnsavedChanges || isSavingLabels}
                        className={`text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider
                            ${hasUnsavedChanges 
                                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(217,119,6,0.5)]" 
                                : "bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed"}`}
                    >
                        {isSavingLabels ? "⏳ ĐANG GHI NHỚ..." : "💾 ĐỒNG BỘ DATA"}
                    </button>
                    
                    <button 
                        onClick={analyzeFeedback} 
                        disabled={analyzing || hasUnsavedChanges} 
                        className={`text-xs text-white px-6 py-3 rounded-xl transition-all font-extrabold tracking-widest flex items-center gap-2 uppercase
                            ${hasUnsavedChanges 
                                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700" 
                                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-purple-400/30"}`}
                    >
                        {analyzing ? "⏳ ĐANG PHÂN TÍCH..." : "✨ KÍCH HOẠT AI NLP"}
                    </button>
                </div>
            </div>

            {/* KẾT QUẢ AI PHÂN TÍCH */}
            {aiResult && (
                <div className="mb-10 bg-gradient-to-br from-purple-900/40 to-[#0D0D18] rounded-2xl border border-purple-500/50 overflow-hidden animate-fade-in shadow-[0_0_40px_rgba(168,85,247,0.2)] relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-400 shadow-[0_0_15px_#a855f7]"></div>
                    <div className="p-4 bg-black/40 flex justify-between items-center border-b border-purple-500/20 backdrop-blur-md">
                        <span className="text-[11px] font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2 ml-2">
                          🤖 BÁO CÁO PHÂN TÍCH KHỐI NHÓM (NLP)
                        </span>
                        <button onClick={goToSolution} className="text-[11px] bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50 px-4 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-colors uppercase tracking-wider">
                            💡 TƯ VẤN SƯ PHẠM →
                        </button>
                    </div>
                    <div className="p-6 grid gap-5 grid-cols-1 md:grid-cols-2">
                        {aiResult.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-4 p-5 bg-[#05050A] rounded-xl border border-white/5 shadow-inner hover:border-purple-500/30 transition-colors">
                                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border ${item.type === 'negative' ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
                                    <span className="text-2xl font-extrabold font-mono">{item.count}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-bold uppercase text-purple-200 tracking-widest bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded shadow-[inset_0_0_8px_rgba(168,85,247,0.2)]">{item.category}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{item.summary}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 1. KHU VỰC SOS */}
            {sosFeedbacks.length > 0 && (
              <div className="mb-8 bg-red-950/20 border border-red-500/40 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.15)] overflow-hidden">
                <details className="group" open>
                  <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-red-900/30 transition-colors list-none outline-none">
                     <h4 className="text-red-400 font-bold flex items-center gap-3 text-xs uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                       <span className="text-xl animate-pulse">🚨</span> CẢNH BÁO AN TOÀN CẤP 1 ({sosFeedbacks.length})
                     </h4>
                     <span className="text-red-500 font-bold group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  
                  <div className="p-4 pt-0 space-y-3 bg-transparent">
                    {sosFeedbacks.map((fb: any, idx: number) => (
                      <div key={idx} className="bg-[#05050A] rounded-xl border border-red-500/30 shadow-inner flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 gap-4">
                        <div className="text-red-300 text-sm font-medium italic border-l-4 border-red-500 pl-4 flex-1 leading-relaxed">
                          "{fb.raw_text}"
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[10px] font-bold bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50 text-gray-400 px-3 py-2 rounded-lg border border-white/10 transition-all uppercase tracking-wider">
                                🔙 Khôi phục
                            </button>
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-2 rounded-lg border border-white/10 transition-all uppercase tracking-wider">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
                  <h3 className="font-bold text-gray-200 text-sm flex items-center gap-2 uppercase tracking-widest">
                    <span className="text-purple-400">💌</span> Lời nhắn hợp lệ ({normalFeedbacks.length})
                  </h3>
                  <div className="flex items-center gap-3 bg-[#05050A] px-4 py-2 rounded-full border border-white/10 shadow-inner">
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${showRaw ? 'text-red-400 drop-shadow-[0_0_5px_#ef4444]' : 'text-gray-500'}`}>
                      {showRaw ? '👁️ HIỆN BẢN GỐC' : '🛡️ ĐÃ CHE MỜ (SAFE)'}
                    </span>
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none border border-white/10 ${showRaw ? 'bg-red-600 shadow-[0_0_15px_#ef4444]' : 'bg-emerald-600 shadow-[0_0_15px_#10b981]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showRaw ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

    <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-2">
                  {normalFeedbacks.length > 0 ? normalFeedbacks.map((fb: any, i: number) => {
                      const isHarsh = fb.is_harsh;
                      let textToDisplay = (isHarsh && !showRaw) ? "Nội dung nhạy cảm đã bị ẩn. Bật Raw Mode để xem." : fb.raw_text;
                      const isHiddenHarsh = isHarsh && !showRaw;

                      return (
                        <div key={i} className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl transition-all duration-300 border relative overflow-hidden
                            ${isHiddenHarsh ? 'bg-white/5 border-white/5 text-gray-500' : 'bg-[#05050A] border-white/10 text-gray-300 hover:bg-[#0A0A12] hover:border-purple-500/30'}
                        `}>
                            {/* Hiệu ứng viền chạy khi hover */}
                            {!isHiddenHarsh && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_#a855f7]"></div>}

                            <div className="relative z-10 flex-1 pl-2">
                                {isHiddenHarsh && <span className="mr-3 inline-block bg-black text-gray-500 border border-gray-700 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest not-italic">🔒 ENCRYPTED</span>}
                                <span className={`leading-relaxed ${isHiddenHarsh ? 'italic font-mono text-[11px]' : 'font-medium text-[13px]'}`}>
                                    {isHiddenHarsh ? textToDisplay : `"${textToDisplay}"`}
                                </span>
                            </div>
                            
                            {/* Nút bấm được đẩy sang phải, cùng hàng với text */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 shrink-0 sm:pl-4">
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-500/30 uppercase tracking-widest">
                                    🚨 SOS
                                </button>
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[9px] font-bold text-gray-500 hover:bg-white/10 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-white/10 uppercase tracking-widest">
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
                <div className="mt-8 border-t border-white/10 pt-6">
                    <button 
                        onClick={() => setShowTrash(!showTrash)} 
                        className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-2 font-bold transition-colors uppercase tracking-widest"
                    >
                        🗑️ THÙNG RÁC AI ĐÃ LỌC ({spamFeedbacks.length}) {showTrash ? "▲" : "▼"}
                    </button>
                    
                    {showTrash && (
                        <div className="mt-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-4 bg-[#05050A] rounded-2xl border border-white/5 shadow-inner">
                            {spamFeedbacks.map((fb: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row justify-between md:items-center bg-[#0A0A12] p-3.5 rounded-xl border border-white/5 gap-4">
                                    <div className="text-gray-500 text-[11px] italic pr-2 flex-1 line-through decoration-gray-700 font-mono">
                                        <span className="font-bold text-red-500/50 mr-3 not-italic bg-red-500/10 px-1.5 py-0.5 rounded">BLOCKED</span>
                                        {fb.raw_text}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] uppercase tracking-wider">
                                            ✅ Khôi phục
                                        </button>
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors border border-red-500/20 uppercase tracking-wider">
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
        <div className="text-center py-32 bg-[#0D0D18] rounded-[3rem] border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
            <div className="text-6xl opacity-20 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">📭</div>
            <h3 className="text-xl font-bold text-gray-400 tracking-widest uppercase">Lõi Dữ Liệu Trống</h3>
            <p className="text-xs text-gray-600 mt-3 font-mono">Vui lòng chọn một mã định danh từ Command Bar phía trên để trích xuất.</p>
        </div>
      )}
    </div>
  );
}