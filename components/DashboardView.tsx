"use client";
import { useState, useEffect } from "react";
// 🚀 NÂNG CẤP 1: Import hệ thống điều hướng không tải lại trang của Next.js
import { useRouter } from "next/navigation";

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-xs text-slate-500 italic text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">{msg}</div>;
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
    
    // 🚀 NÂNG CẤP 3: Sử dụng router.push để chuyển tab mượt mà, giữ nguyên dữ liệu giáo án
    router.push("/?tab=ai&mode=solve");
  };

  const handleDelete = async () => {
      if (!selectedId) return;
      if (!confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi dữ liệu này?")) return;
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
    
    // Đã loại bỏ các shadow neon không cần thiết cho Light theme
    return (
      <div className="mb-4 group">
        <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-slate-500 uppercase tracking-wide">
          <span className="truncate max-w-[80%] text-slate-700" title={label}>{label}</span>
          <span className="text-slate-800 font-mono">{val || 0} <span className="text-slate-400">({pct}%)</span></span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div className={`h-2 rounded-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }}></div>
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
    <div className="space-y-8 font-sans text-slate-800 animate-fade-in pb-12 max-w-7xl mx-auto">
      
      {/* HEADER COMMAND BAR */}
      <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2 tracking-wide uppercase">
               <span className="text-blue-500">📊</span> Báo cáo lớp học
            </h2>
            {currentSubject && (
              <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                {currentSubject}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-mono mt-1">{stats ? `Mẫu thu thập: ${stats.total} biến số` : "Đang chờ chỉ định tệp dữ liệu..."}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto items-center">
            {surveys.length > 0 ? (
            <>
                <select 
                    className="flex-1 p-3 border rounded-xl text-sm min-w-[300px] max-w-[450px] bg-slate-50 text-slate-800 border-slate-200 font-mono outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 focus:bg-white shadow-inner [&>option]:bg-white"
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
                <button onClick={fetchStats} className="p-3 bg-white text-slate-600 rounded-xl hover:bg-slate-50 hover:text-blue-600 border border-slate-200 transition-colors shadow-sm" title="Đồng bộ lại">🔄</button>
                <button onClick={handleDelete} disabled={deleting} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-200 transition-colors shadow-sm" title="Tiêu hủy tệp">{deleting ? "..." : "🗑️"}</button>
            </>
            ) : <div className="text-amber-600 text-sm p-2 font-mono bg-amber-50 rounded-lg border border-amber-200">Chưa có tệp dữ liệu nào trong kho.</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32"><p className="text-sm font-mono text-blue-600 animate-pulse tracking-widest uppercase">Đang nạp dữ liệu từ máy chủ...</p></div>
      ) : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* HERO CARD - TỔNG PHIẾU */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
             <div className="relative z-10 flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-[6px] border-white flex items-center justify-center shadow-md bg-blue-100">
                   <div className="text-5xl font-extrabold text-blue-700">{stats.total || 0}</div>
                </div>
                <div>
                   <div className="text-sm text-blue-800 uppercase font-bold tracking-widest mb-1">Mật độ Dữ liệu</div>
                   <div className="text-xs text-slate-600 font-mono">Trạng thái: <span className={`font-bold ${stats.total > 20 ? "text-emerald-600" : "text-amber-600"}`}>{stats.total > 20 ? 'Ổn định' : 'Thiếu hụt'}</span></div>
                </div>
             </div>
             
             <div className="relative z-10 text-right mt-6 sm:mt-0 flex flex-col items-end">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Chỉ số Cảm xúc Cao nhất</div>
                <div className="text-2xl font-bold bg-white border border-blue-100 px-6 py-3 rounded-2xl shadow-sm text-indigo-700">
                  {stats.feeling && Object.keys(stats.feeling).length > 0 ? Object.entries(stats.feeling).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] : "Chưa xác định"}
                </div>
             </div>
          </div>

          {/* CHARTS CARDS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:border-pink-300">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-pink-500 text-lg">🎭</span> Cảm xúc</h3>
            {stats.feeling && Object.keys(stats.feeling).length > 0 ? 
                Object.entries(stats.feeling).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />) 
                : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:border-emerald-300">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-emerald-500 text-lg">🧠</span> Mức độ hiểu</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding)
                  .sort((a:any, b:any) => a[0].localeCompare(b[0]))
                  .map(([k, v]: any) => {
                      const code = k.split(" ")[0].split("–")[0].trim();
                      const labelMap: Record<string, string> = { "B1": "Chưa hiểu (Mất gốc)", "B2": "Mơ hồ (Cần xem lại)", "B3": "Hiểu sơ (Cơ bản)", "B4": "Hiểu rõ (Tự tin)" };
                      const colorMap: Record<string, string> = { "B1": "bg-red-500", "B2": "bg-orange-400", "B3": "bg-blue-400", "B4": "bg-emerald-500" };
                      return <ProgressBar key={k} label={labelMap[code] || k} val={v} total={stats.total} color={colorMap[code] || "bg-slate-400"} />;
                  })
            ) : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
          </div>

          <div className="bg-red-50/50 p-6 rounded-3xl border border-red-200 shadow-sm relative overflow-hidden row-span-2 group">
            <h3 className="font-bold text-red-700 mb-6 flex items-center gap-2 relative z-10 uppercase tracking-wide text-sm"><span className="text-xl">⚠️</span> Điểm nghẽn</h3>
            <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.difficulties && Object.keys(stats.difficulties).length > 0 ? 
                Object.entries(stats.difficulties).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100 shadow-sm hover:border-red-300 transition-colors">
                    <span className="text-[12px] font-medium text-slate-700 leading-relaxed max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-mono">{v}</span>
                  </div>
                )) 
              : <div className="text-center py-10 text-emerald-600 text-xs font-bold tracking-wider uppercase border border-dashed border-emerald-300 rounded-xl bg-emerald-50">Hệ thống an toàn. Không có điểm nghẽn.</div>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:border-blue-300">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-blue-500 text-lg">💡</span> Mong muốn</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.adjustments && Object.keys(stats.adjustments).length > 0 ? 
                  Object.entries(stats.adjustments).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-blue-500" />)
                  : <EmptyState msg="Chưa thu thập đủ dữ liệu" />}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:border-purple-300">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wide text-sm"><span className="text-purple-500 text-lg">🎨</span> Phong cách học</h3>
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
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                      <span className="text-amber-500">⚡</span> Khảo sát tùy chọn
                   </h3>
                   <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(stats.custom_charts).map(([qKey, chartData]: any) => {
                        let parsedPayload = surveyPayload;
                        if (typeof surveyPayload === 'string') { try { parsedPayload = JSON.parse(surveyPayload); } catch(e){} }
                        let qTitle = findQuestionTitle(parsedPayload, qKey) || qKey;
                        
                        return (
                          <div key={qKey} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                              <h4 className="font-bold text-slate-800 mb-6 text-sm leading-relaxed border-b border-slate-100 pb-3">{qTitle}</h4>
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
          <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-blue-200 shadow-lg col-span-1 md:col-span-2 lg:col-span-3 mt-4 relative overflow-hidden">
            
            {/* THANH ĐIỀU KHIỂN & XÁC NHẬN */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                    <span className="text-xl">🧠</span> Trạm Huấn Luyện AI
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2 font-mono">Hiệu chỉnh nhãn dán thủ công để tối ưu hóa thuật toán NLP.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {hasUnsavedChanges && (
                        <span className="text-[10px] font-bold text-amber-600 animate-pulse flex items-center gap-1 uppercase tracking-wider bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                            ⚠️ Cần đồng bộ
                        </span>
                    )}
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={!hasUnsavedChanges || isSavingLabels}
                        className={`text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider
                            ${hasUnsavedChanges 
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md" 
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"}`}
                    >
                        {isSavingLabels ? "⏳ ĐANG GHI NHỚ..." : "💾 ĐỒNG BỘ DATA"}
                    </button>
                    
                    <button 
                        onClick={analyzeFeedback} 
                        disabled={analyzing || hasUnsavedChanges} 
                        className={`text-xs text-white px-6 py-3 rounded-xl transition-all font-extrabold tracking-widest flex items-center gap-2 uppercase
                            ${hasUnsavedChanges 
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400" 
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md border border-blue-500"}`}
                    >
                        {analyzing ? "⏳ ĐANG PHÂN TÍCH..." : "✨ KÍCH HOẠT AI NLP"}
                    </button>
                </div>
            </div>

          {/* KẾT QUẢ AI PHÂN TÍCH (ĐÃ NÂNG CẤP GOM NHÓM & TÔ MÀU) */}
            {aiResult && (
                <div className="mb-10 bg-blue-50/50 rounded-2xl border border-blue-200 overflow-hidden animate-fade-in shadow-sm relative">
                    <div className="p-4 bg-white flex justify-between items-center border-b border-blue-100">
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2 ml-2">
                            🤖 BÁO CÁO PHÂN TÍCH KHỐI NHÓM (NLP)
                        </span>
                        <button onClick={goToSolution} className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors uppercase tracking-wider">
                            💡 TƯ VẤN SƯ PHẠM →
                        </button>
                    </div>
                    
                    {/* KHU VỰC HIỂN THỊ GOM NHÓM */}
                    <div className="p-6 grid gap-6 grid-cols-1 md:grid-cols-2">
                        {Object.entries(
                            // 🚀 Thuật toán gom nhóm nhanh gọn ngay trong lúc Render
                            aiResult.reduce((acc: any, item: any) => {
                                if (!acc[item.category]) acc[item.category] = { items: [], totalCount: 0 };
                                acc[item.category].items.push(item);
                                acc[item.category].totalCount += (item.count || 1);
                                return acc;
                            }, {})
                        ).map(([category, group]: [string, any], idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col">
                                
                                {/* Header của từng Nhóm */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 uppercase tracking-widest">
                                        {category}
                                    </span>
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs" title="Tổng số phiếu của nhóm này">
                                        {group.totalCount}
                                    </div>
                                </div>

                                {/* Danh sách ý kiến bên trong nhóm (Tô màu theo cảm xúc) */}
                                <ul className="space-y-3">
                                    {group.items.map((item: any, i: number) => {
                                        // 🎨 Logic tô màu dựa trên "type" trả về từ AI
                                        let colorClass = "text-amber-600"; // Trung tính (Góp ý)
                                        let bgClass = "bg-amber-50";
                                        let borderClass = "border-amber-200";
                                        let icon = "▶"; 

                                        if (item.type === 'positive') {
                                            colorClass = "text-emerald-600"; // Tích cực (Lời khen)
                                            bgClass = "bg-emerald-50";
                                            borderClass = "border-emerald-200";
                                            icon = "✓";
                                        } else if (item.type === 'negative') {
                                            colorClass = "text-red-600"; // Tiêu cực (Điểm nghẽn)
                                            bgClass = "bg-red-50";
                                            borderClass = "border-red-200";
                                            icon = "⚠";
                                        }

                                        return (
                                            <li key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${borderClass} ${bgClass} transition-colors`}>
                                                <span className={`mt-0.5 text-xs font-black ${colorClass}`}>
                                                    {icon}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                                                        {item.summary}
                                                        {item.count > 1 && (
                                                            <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border ${borderClass} ${colorClass} bg-white inline-block`}>
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
              <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl shadow-sm overflow-hidden">
                <details className="group" open>
                  <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-red-100 transition-colors list-none outline-none">
                     <h4 className="text-red-600 font-bold flex items-center gap-3 text-xs uppercase tracking-widest">
                       <span className="text-xl">🚨</span> CẢNH BÁO AN TOÀN CẤP 1 ({sosFeedbacks.length})
                     </h4>
                     <span className="text-red-500 font-bold group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  
                  <div className="p-4 pt-0 space-y-3 bg-transparent">
                    {sosFeedbacks.map((fb: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-xl border border-red-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 gap-4">
                        <div className="text-red-700 text-sm font-medium italic border-l-4 border-red-500 pl-4 flex-1 leading-relaxed">
                          "{fb.raw_text}"
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-600 hover:border-emerald-300 px-3 py-2 rounded-lg border border-slate-200 transition-all uppercase tracking-wider shadow-sm">
                                🔙 Khôi phục
                            </button>
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 transition-all uppercase tracking-wider shadow-sm">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border-b border-slate-200 pb-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                    <span className="text-blue-500">💌</span> Lời nhắn hợp lệ ({normalFeedbacks.length})
                  </h3>
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${showRaw ? 'text-red-500' : 'text-slate-500'}`}>
                      {showRaw ? '👁️ HIỆN BẢN GỐC' : '🛡️ ĐÃ CHE MỜ (SAFE)'}
                    </span>
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none border border-slate-200 ${showRaw ? 'bg-red-500' : 'bg-emerald-500'}`}
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
                            ${isHiddenHarsh ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 shadow-sm hover:shadow'}
                        `}>
                            <div className="relative z-10 flex-1 pl-2 border-l-2 border-transparent group-hover:border-blue-400 transition-colors">
                                {isHiddenHarsh && <span className="mr-3 inline-block bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest not-italic">🔒 ENCRYPTED</span>}
                                <span className={`leading-relaxed ${isHiddenHarsh ? 'italic font-mono text-[11px]' : 'font-medium text-[13px]'}`}>
                                    {isHiddenHarsh ? textToDisplay : `"${textToDisplay}"`}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 shrink-0 sm:pl-4">
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold text-red-500 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest shadow-sm">
                                    🚨 SOS
                                </button>
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[9px] font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest shadow-sm">
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
                <div className="mt-8 border-t border-slate-200 pt-6">
                    <button 
                        onClick={() => setShowTrash(!showTrash)} 
                        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-2 font-bold transition-colors uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"
                    >
                        🗑️ THÙNG RÁC AI ĐÃ LỌC ({spamFeedbacks.length}) {showTrash ? "▲" : "▼"}
                    </button>
                    
                    {showTrash && (
                        <div className="mt-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                            {spamFeedbacks.map((fb: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row justify-between md:items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm gap-4">
                                    <div className="text-slate-500 text-[11px] italic pr-2 flex-1 line-through decoration-slate-300 font-mono">
                                        <span className="font-bold text-red-500 mr-3 not-italic bg-red-50 px-1.5 py-0.5 rounded border border-red-100">BLOCKED</span>
                                        {fb.raw_text}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[9px] font-bold bg-white text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm uppercase tracking-wider">
                                            ✅ Khôi phục
                                        </button>
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[9px] font-bold bg-white text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm uppercase tracking-wider">
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
        <div className="text-center py-32 bg-white rounded-[3rem] border border-blue-100 shadow-sm">
            <div className="text-6xl opacity-30 mb-6">📭</div>
            <h3 className="text-xl font-bold text-slate-500 tracking-widest uppercase">Lõi Dữ Liệu Trống</h3>
            <p className="text-xs text-slate-400 mt-3 font-mono">Vui lòng chọn một mã định danh từ Command Bar phía trên để trích xuất.</p>
        </div>
      )}
    </div>
  );
}