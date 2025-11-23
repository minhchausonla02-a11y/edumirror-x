"use client";
import { useState, useEffect } from "react";

export default function DashboardView() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // State cho AI
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any[] | null>(null);

  // 1. Load danh sách
  useEffect(() => {
    fetch("/api/list-surveys").then(res => res.json()).then(data => {
        if (data.surveys?.length > 0) {
          setSurveys(data.surveys);
          if(!selectedId) setSelectedId(data.surveys[0].short_id);
        }
    });
  }, []);

  // 2. Load chi tiết
  const fetchStats = () => {
    if (!selectedId) return;
    setLoading(true);
    setAiResult(null);
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if(data.stats) setStats(data.stats); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedId]);

  // Hàm gọi AI (Giữ nguyên logic cũ)
  const analyzeFeedback = async (feedbacks: string[]) => {
    setAnalyzing(true);
    try {
        const savedKey = localStorage.getItem("edumirror_key");
        const res = await fetch("/api/analyze-feedback", {
            method: "POST",
            body: JSON.stringify({ feedbacks, apiKey: savedKey })
        });
        const data = await res.json();
        if (Array.isArray(data.result)) setAiResult(data.result);
    } catch (e) { alert("Lỗi AI"); } 
    finally { setAnalyzing(false); }
  };

  const goToSolution = () => {
    if (!aiResult) return;
    const problemText = aiResult.map((item: any) => `- ${item.category}: ${item.summary}`).join("\n");
    localStorage.setItem("current_diagnosis", problemText);
    window.location.href = "/?tab=ai&mode=solve";
  };

  // Helper Progress Bar
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-3 group">
        <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
          <span className="truncate max-w-[85%]">{label}</span>
          <span className="text-gray-900 font-bold">{val} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const showData = stats && typeof stats === 'object';

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📊 Bức tranh lớp học</h2>
          <p className="text-xs text-gray-500">{stats ? `Dữ liệu từ ${stats.total} em` : "Chọn phiếu để xem"}</p>
        </div>
        <div className="flex gap-2">
            <select className="p-2 border rounded-lg text-sm min-w-[200px] bg-gray-50 outline-none"
                value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {surveys.map(s => (
                <option key={s.short_id} value={s.short_id}>
                    {s.payload?.title?.substring(0, 30)}... ({new Date(s.created_at).toLocaleDateString('vi-VN')})
                </option>
                ))}
            </select>
            <button onClick={fetchStats} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">🔄</button>
        </div>
      </div>

      {loading ? <div className="text-center py-20 text-indigo-500 animate-pulse font-bold">Đang phân tích...</div> : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* 1. TỔNG QUAN & CẢM XÚC (Q1) */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold">Tổng phiếu</div>
                <div className="text-5xl font-bold mb-4">{stats.total}</div>
                <div className="text-xs opacity-80 uppercase font-bold">Cảm xúc chủ đạo</div>
                <div className="text-2xl font-bold mt-1">
                  {stats.feeling && Object.keys(stats.feeling).length > 0 
                    ? Object.entries(stats.feeling).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] 
                    : "—"}
                </div>
             </div>
             <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 blur-3xl"></div>
          </div>

          {/* 2. MỨC ĐỘ HIỂU BÀI (Q2) */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 text-sm flex gap-2">🧠 Mức độ hiểu bài</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? 
                Object.entries(stats.understanding).map(([k, v]) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-emerald-500" />) 
                : <p className="text-xs text-gray-400 italic">Chưa có dữ liệu</p>}
          </div>

          {/* 3. ĐIỂM NGHẼN KIẾN THỨC (Q3 - Quan trọng) */}
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm row-span-2">
            <h3 className="font-bold text-red-600 mb-4 text-sm flex gap-2">⚠️ Điểm nghẽn (Khó khăn)</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {stats.difficulties && Object.keys(stats.difficulties).length > 0 ? 
                Object.entries(stats.difficulties).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-2.5 rounded-lg border border-red-100">
                    <span className="text-xs font-medium text-gray-800 leading-snug max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-white text-red-600 px-2 py-0.5 rounded shadow-sm">{v}</span>
                  </div>
                )) 
              : <div className="text-center py-10 text-green-600 text-xs">Tuyệt vời! Không có điểm nghẽn lớn.</div>}
            </div>
          </div>

          {/* 4. MONG MUỐN ĐIỀU CHỈNH (Q4) */}
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
            <h3 className="font-bold text-blue-600 mb-4 text-sm flex gap-2">💡 Mong muốn điều chỉnh</h3>
            <div className="max-h-40 overflow-y-auto pr-1">
                {stats.adjustments && Object.keys(stats.adjustments).length > 0 ? 
                    Object.entries(stats.adjustments).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-blue-500" />)
                    : <p className="text-xs text-gray-400 italic">Chưa có dữ liệu</p>}
            </div>
          </div>

          {/* 5. PHONG CÁCH HỌC (Q5 - MỚI) */}
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <h3 className="font-bold text-purple-600 mb-4 text-sm flex gap-2">🎨 Phong cách học ưa thích</h3>
            <div className="max-h-40 overflow-y-auto pr-1">
                {stats.styles && Object.keys(stats.styles).length > 0 ? 
                    Object.entries(stats.styles).map(([k, v]: any) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-purple-500" />)
                    : <p className="text-xs text-gray-400 italic">Chưa có dữ liệu</p>}
            </div>
          </div>

          {/* 6. LỜI NHẮN & AI (Q6) */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-sm">💌 Lời nhắn ({stats.feedbacks?.length || 0})</h3>
                {stats.feedbacks?.length > 0 && (
                    <button onClick={() => analyzeFeedback(stats.feedbacks)} disabled={analyzing} className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all font-bold">
                        {analyzing ? "Đang đọc..." : "✨ AI Phân tích"}
                    </button>
                )}
            </div>

            {/* Kết quả AI */}
            {aiResult && (
                <div className="mb-4 bg-indigo-50/50 rounded-xl border border-indigo-100 p-3 animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-indigo-800 uppercase">🤖 AI Tổng hợp</span>
                        <button onClick={goToSolution} className="text-xs bg-white text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg font-bold shadow-sm">💡 Nhờ AI tư vấn giải pháp →</button>
                    </div>
                    <div className="space-y-2">
                        {aiResult.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm flex gap-3">
                                <span className="text-lg font-bold text-indigo-200">{item.count}</span>
                                <div>
                                    <p className="text-xs font-bold text-gray-700">{item.category}</p>
                                    <p className="text-xs text-gray-600">{item.summary}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {stats.feedbacks && stats.feedbacks.length > 0 ? stats.feedbacks.map((fb: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 italic border-l-2 border-gray-300">"{fb}"</div>
              )) : <p className="text-xs text-gray-400 col-span-2 text-center py-4">Chưa có lời nhắn nào.</p>}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed">
            <div className="text-4xl mb-2">📭</div>
            Chưa có dữ liệu. Hãy chọn phiếu khác.
        </div>
      )}
    </div>
  );
}