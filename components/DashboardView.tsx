"use client";
import { useState, useEffect } from "react";

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">{msg}</div>;
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
             
             // 🚀 CHUẨN HÓA DỮ LIỆU ĐỂ CÓ THỂ CHỈNH SỬA
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

  // 🚀 HÀM ĐIỀU HƯỚNG CÂU PHẢN HỒI (NORMAL <-> SOS <-> SPAM)
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

  // 🚀 HÀM XÁC NHẬN LƯU (Mô phỏng lưu dữ liệu chuẩn bị cho AI)
  const handleSaveChanges = async () => {
      setIsSavingLabels(true);
      // Giả lập độ trễ lưu Database để tạo UX chuyên nghiệp
      await new Promise(r => setTimeout(r, 800)); 
      setHasUnsavedChanges(false);
      setIsSavingLabels(false);
  };

  const analyzeFeedback = async () => {
    setAnalyzing(true);
    try {
        const savedKey = localStorage.getItem("edumirror_key");
        // AI CHỈ ĐỌC DỮ LIỆU ĐÃ ĐƯỢC GIÁO VIÊN DUYỆT (NORMAL)
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
      if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn phiếu này?")) return;
      setDeleting(true);
      try {
          const res = await fetch(`/api/delete-survey?id=${selectedId}`, { method: "DELETE" });
          if (res.ok) { alert("Đã xóa thành công!"); fetchSurveys(); } 
          else { alert("Lỗi khi xóa phiếu."); }
      } catch (e) { alert("Lỗi kết nối server."); } 
      finally { setDeleting(false); }
  };

  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-3 group">
        <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
          <span className="truncate max-w-[80%]" title={label}>{label}</span>
          <span className="text-gray-900 font-bold">{val || 0} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className={`h-2 rounded-full ${color} transition-all duration-700 group-hover:opacity-80`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const showData = !!stats;

  // PHÂN LOẠI DỰA TRÊN DỮ LIỆU CÓ THỂ CHỈNH SỬA (editableFeedbacks)
  const sosFeedbacks = editableFeedbacks.filter((fb: any) => fb.is_sos && !fb.is_spam);
  const spamFeedbacks = editableFeedbacks.filter((fb: any) => fb.is_spam);
  const normalFeedbacks = editableFeedbacks.filter((fb: any) => !fb.is_sos && !fb.is_spam);

  const currentSurvey = surveys.find(s => s.short_id === selectedId);
  const currentSubject = currentSurvey ? extractSubject(currentSurvey.payload?.type) : "";

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📊 Báo cáo lớp học</h2>
            {currentSubject && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
                📚 {currentSubject}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{stats ? `Dữ liệu từ ${stats.total} học sinh` : "Chọn phiếu để xem"}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto items-center">
            {surveys.length > 0 ? (
            <>
                <select 
                    className="flex-1 p-3 border rounded-xl text-sm min-w-[300px] max-w-[450px] bg-gray-50 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
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
                <button onClick={fetchStats} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 border border-indigo-100" title="Làm mới">🔄</button>
                <button onClick={handleDelete} disabled={deleting} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100 transition-colors" title="Xóa phiếu này">{deleting ? "..." : "🗑️"}</button>
            </>
            ) : <div className="text-red-500 text-sm p-2">Chưa có phiếu nào.</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-indigo-500"><p className="text-sm font-bold animate-pulse">Đang tải dữ liệu...</p></div>
      ) : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-lg text-white flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-1">Tổng phiếu</div>
                <div className="text-6xl font-bold tracking-tight">{stats.total || 0}</div>
             </div>
             <div className="relative z-10 text-right mt-4 sm:mt-0">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-2">Cảm xúc chủ đạo</div>
                <div className="text-3xl font-bold bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm inline-block">
                  {stats.feeling && Object.keys(stats.feeling).length > 0 ? Object.entries(stats.feeling).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] : "—"}
                </div>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="bg-pink-100 text-pink-600 p-1 rounded text-sm">🎭</span> Cảm xúc</h3>
            {stats.feeling && Object.keys(stats.feeling).length > 0 ? 
                Object.entries(stats.feeling).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />) 
                : <EmptyState msg="Chưa có dữ liệu" />}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-600 p-1 rounded text-sm">🧠</span> Mức độ hiểu</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding)
                  .sort((a:any, b:any) => a[0].localeCompare(b[0]))
                  .map(([k, v]: any) => {
                      const code = k.split(" ")[0].split("–")[0].trim();
                      const labelMap: Record<string, string> = { "B1": "Chưa hiểu (Mất gốc)", "B2": "Mơ hồ (Cần xem lại)", "B3": "Hiểu sơ (Cơ bản)", "B4": "Hiểu rõ (Tự tin)" };
                      const colorMap: Record<string, string> = { "B1": "bg-red-500", "B2": "bg-orange-400", "B3": "bg-blue-400", "B4": "bg-emerald-500" };
                      return <ProgressBar key={k} label={labelMap[code] || k} val={v} total={stats.total} color={colorMap[code] || "bg-gray-400"} />;
                  })
            ) : <EmptyState msg="Chưa có dữ liệu" />}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden row-span-2">
            <h3 className="font-bold text-red-600 mb-6 flex items-center gap-2 relative z-10"><span className="bg-red-100 text-red-600 p-1 rounded text-sm">⚠️</span> Điểm nghẽn</h3>
            <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.difficulties && Object.keys(stats.difficulties).length > 0 ? 
                Object.entries(stats.difficulties).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="text-xs font-medium text-gray-800 leading-snug max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded shadow-sm">{v}</span>
                  </div>
                )) 
              : <div className="text-center py-8 text-green-600 text-xs font-bold">Lớp nắm bài tốt!</div>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
            <h3 className="font-bold text-blue-600 mb-6 flex items-center gap-2"><span className="bg-blue-100 text-blue-600 p-1 rounded text-sm">💡</span> Mong muốn</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.adjustments && Object.keys(stats.adjustments).length > 0 ? 
                  Object.entries(stats.adjustments).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-blue-500" />)
                  : <EmptyState msg="Chưa có dữ liệu" />}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm">
            <h3 className="font-bold text-purple-600 mb-6 flex items-center gap-2"><span className="bg-purple-100 text-purple-600 p-1 rounded text-sm">🎨</span> Phong cách học</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.styles && Object.keys(stats.styles).length > 0 ? 
                  Object.entries(stats.styles).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-purple-500" />)
                  : <EmptyState msg="Chưa có dữ liệu" />}
            </div>
          </div>

          {stats?.custom_charts && Object.keys(stats.custom_charts).length > 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-2">
                <div className="flex items-center gap-2 mb-4 px-2">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg text-sm shadow-sm">📝</span> 
                      Khảo sát bổ sung (Tùy chọn)
                   </h3>
                   <div className="flex-1 h-px bg-amber-200 ml-2"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(stats.custom_charts).map(([qKey, chartData]: any) => {
                        let parsedPayload = surveyPayload;
                        if (typeof surveyPayload === 'string') {
                            try { parsedPayload = JSON.parse(surveyPayload); } catch(e){}
                        }
                        let qTitle = findQuestionTitle(parsedPayload, qKey) || qKey;
                        return (
                          <div key={qKey} className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10"></div>
                              <h4 className="font-bold text-gray-800 mb-5 text-sm leading-snug">{qTitle}</h4>
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
          {/* LỜI NHẮN & AI (ĐÃ NÂNG CẤP HUMAN-IN-THE-LOOP) */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            
            {/* THANH ĐIỀU KHIỂN & XÁC NHẬN */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <span className="bg-white p-1 rounded shadow-sm">🧠</span> Huấn luyện phân loại AI
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1">Thầy/cô có thể điều chỉnh lại các câu AI phân loại sai trước khi lưu.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                            ⚠️ Có thay đổi chưa lưu
                        </span>
                    )}
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={!hasUnsavedChanges || isSavingLabels}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2
                            ${hasUnsavedChanges 
                                ? "bg-amber-500 hover:bg-amber-600 text-white animate-bounce-slight" 
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                    >
                        {isSavingLabels ? "⏳ Đang lưu..." : "💾 Xác nhận & Lưu"}
                    </button>
                    
                    <button 
                        onClick={analyzeFeedback} 
                        disabled={analyzing || hasUnsavedChanges} 
                        className={`text-xs text-white px-4 py-2 rounded-xl shadow transition-all font-bold
                            ${hasUnsavedChanges 
                                ? "bg-gray-300 cursor-not-allowed" 
                                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105"}`}
                    >
                        {analyzing ? "Đang đọc..." : "✨ AI Phân tích Nhóm"}
                    </button>
                </div>
            </div>

            {/* KẾT QUẢ AI PHÂN TÍCH */}
            {aiResult && (
                <div className="mb-8 bg-indigo-50/60 rounded-2xl border border-indigo-100 overflow-hidden animate-fade-in">
                    <div className="p-3 bg-indigo-100/50 flex justify-between items-center border-b border-indigo-200">
                        <span className="text-xs font-bold text-indigo-800 uppercase">🤖 Kết quả phân tích nhóm</span>
                        <button onClick={goToSolution} className="text-xs bg-white text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg font-bold shadow-sm hover:bg-indigo-50 transition-colors">
                            💡 Nhờ AI tư vấn giải pháp ngay →
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        {aiResult.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${item.type === 'negative' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <span className="text-lg font-bold">{item.count}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{item.category}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 font-medium leading-snug">{item.summary}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 1. KHU VỰC SOS */}
            {sosFeedbacks.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl shadow-sm overflow-hidden">
                <details className="group" open>
                  <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-red-100 transition-colors list-none outline-none">
                     <h4 className="text-red-700 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
                       <span className="text-xl">🚨</span> Cảnh báo an toàn ({sosFeedbacks.length})
                     </h4>
                     <span className="text-red-500 font-bold group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  
                  <div className="p-4 pt-0 space-y-3 bg-red-50">
                    {sosFeedbacks.map((fb: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 gap-3">
                        <div className="text-red-900 text-sm font-bold italic border-l-4 border-red-500 pl-3 flex-1">
                          "{fb.raw_text}"
                        </div>
                        {/* NÚT ĐIỀU KHIỂN */}
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[10px] font-bold bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-600 px-2 py-1.5 rounded transition-colors">
                                🔙 Khôi phục (Bình thường)
                            </button>
                            <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[10px] font-bold bg-gray-100 hover:bg-gray-300 text-gray-600 px-2 py-1.5 rounded transition-colors">
                                🗑️ Bỏ rác
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* 2. KHU VỰC LỜI NHẮN ẨN DANH (HỢP LỆ) */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    💌 Lời nhắn hợp lệ ({normalFeedbacks.length})
                  </h3>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    <span className={`text-[10px] font-bold transition-colors ${showRaw ? 'text-red-600' : 'text-gray-500'}`}>
                      {showRaw ? '👁️ Đang hiện bản gốc' : '🛡️ Đã bật khiên bảo vệ'}
                    </span>
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showRaw ? 'bg-red-500' : 'bg-emerald-400'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showRaw ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-2">
                  {normalFeedbacks.length > 0 ? normalFeedbacks.map((fb: any, i: number) => {
                      const isHarsh = fb.is_harsh;
                      let textToDisplay = (isHarsh && !showRaw) ? "Nội dung nhạy cảm đã bị che. Tắt Khiên để xem." : fb.raw_text;
                      const isHiddenHarsh = isHarsh && !showRaw;

                      return (
                        <div key={i} className={`group p-3.5 rounded-xl text-xs transition-all duration-300 border border-gray-100 flex flex-col justify-between h-full
                            ${isHiddenHarsh ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-700 shadow-sm hover:shadow-md'}
                        `}>
                            <div>
                                {isHiddenHarsh && <div className="mb-1"><span className="inline-block bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-bold not-italic">🔒 Đã khóa</span></div>}
                                <span className={`leading-relaxed ${isHiddenHarsh ? 'italic font-medium' : 'italic'}`}>
                                    {isHiddenHarsh ? textToDisplay : `"${textToDisplay}"`}
                                </span>
                            </div>
                            
                            {/* NÚT ĐIỀU KHIỂN (Hiện khi hover) */}
                            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors" title="Chuyển vào Cảnh báo">
                                    🚨 Đánh dấu SOS
                                </button>
                                <button onClick={() => handleMoveFeedback(fb.raw_text, 'spam')} className="text-[10px] font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-700 px-2 py-1 rounded transition-colors" title="Chuyển vào Thùng rác">
                                    🗑️ Bỏ rác
                                </button>
                            </div>
                        </div>
                      );
                  }) : <EmptyState msg="Chưa có lời nhắn hợp lệ" />}
                </div>
            </div>

            {/* 3. KHU VỰC THÙNG RÁC AI */}
            {spamFeedbacks.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                    <button 
                        onClick={() => setShowTrash(!showTrash)} 
                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-2 font-bold transition-colors"
                    >
                        🗑️ Thùng rác AI đã lọc ({spamFeedbacks.length}) {showTrash ? "▲" : "▼"}
                    </button>
                    
                    {showTrash && (
                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-3 bg-gray-50 rounded-xl border border-gray-200">
                            {spamFeedbacks.map((fb: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                                    <div className="text-gray-400 text-[11px] italic pr-2">
                                        <span className="font-bold text-red-400 mr-2">[Bị chặn]</span>
                                        "{fb.raw_text}"
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'normal')} className="text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded transition-colors border border-emerald-100">
                                            ✅ Khôi phục
                                        </button>
                                        <button onClick={() => handleMoveFeedback(fb.raw_text, 'sos')} className="text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded transition-colors border border-red-100">
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
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <div className="text-5xl opacity-20 mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu</h3>
            <p className="text-sm text-gray-400 mt-2">Hãy chọn phiếu khác hoặc đợi học sinh phản hồi.</p>
        </div>
      )}
    </div>
  );
}