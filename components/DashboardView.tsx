"use client";
import { useState, useEffect } from "react";

export default function DashboardView() {
  // --- STATE QUẢN LÝ DỮ LIỆU DASHBOARD ---
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // --- STATE QUẢN LÝ AI PHÂN TÍCH FEEDBACK ---
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any[] | null>(null);

  // 1. Tải danh sách phiếu
  useEffect(() => {
    fetch("/api/list-surveys")
      .then((res) => res.json())
      .then((data) => {
        if (data.surveys && data.surveys.length > 0) {
          setSurveys(data.surveys);
          // Chọn phiếu mới nhất nếu chưa chọn
          if (!selectedId) setSelectedId(data.surveys[0].short_id);
        }
      })
      .catch(err => console.error("Lỗi list:", err));
  }, []);

  // Hàm tải dữ liệu chi tiết
  const fetchStats = () => {
    if (!selectedId) return;
    setLoading(true);
    setAiResult(null); // Reset kết quả AI khi đổi phiếu
    
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
         if (data.stats) setStats(data.stats);
         else setStats(null);
      })
      .catch(err => console.error("Lỗi stats:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedId]);

  // --- HÀM 1: GỌI AI PHÂN TÍCH Ý KIẾN ---
  const analyzeFeedback = async (feedbacks: string[]) => {
    setAnalyzing(true);
    try {
        const savedKey = localStorage.getItem("edumirror_key");
        const res = await fetch("/api/analyze-feedback", {
            method: "POST",
            body: JSON.stringify({ feedbacks, apiKey: savedKey })
        });
        const data = await res.json();
        
        if (Array.isArray(data.result)) {
            setAiResult(data.result);
        } else {
            alert("AI trả về dữ liệu không đúng định dạng.");
        }
    } catch (e) {
        alert("Lỗi kết nối AI. Vui lòng kiểm tra API Key.");
    } finally {
        setAnalyzing(false);
    }
  };

  // --- HÀM 2: CHUYỂN SANG TAB TƯ VẤN (Mang bệnh án đi khám) ---
  const goToSolution = () => {
    if (!aiResult) return;

    // Chuyển đổi kết quả JSON thành một đoạn văn bản "Bệnh án" dễ đọc để gửi sang tab kia
    const diagnosisReport = `
      <h3>KẾT QUẢ PHÂN TÍCH TỪ HỌC SINH:</h3>
      <ul>
        ${aiResult.map((item: any) => `
          <li>
            <strong>${item.category}</strong> (${item.count} phiếu): ${item.summary}
            <br/><em>(VD: "${item.original_sample}")</em>
          </li>
        `).join('')}
      </ul>
    `;
    
    // Lưu vào bộ nhớ tạm
    localStorage.setItem("current_diagnosis", diagnosisReport);
    
    // Chuyển hướng sang tab AI (Thêm tham số mode=solve để kích hoạt chế độ giải quyết vấn đề)
    window.location.href = "/?tab=ai&mode=solve";
  };

  // Helper: Thanh Progress
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-4 last:mb-0 group">
        <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-700">
          <span className="truncate max-w-[75%]" title={label}>{label}</span>
          <span className="text-gray-900 font-bold">{val || 0} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${color} transition-all duration-700 group-hover:opacity-80`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const showData = stats && typeof stats === 'object';

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📊 Báo cáo lớp học</h2>
          <p className="text-sm text-gray-500 mt-1">{stats ? `Dữ liệu từ ${stats.total} học sinh` : "Chọn phiếu để xem"}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            {surveys.length > 0 ? (
            <select 
                className="flex-1 p-3 border rounded-xl text-sm min-w-[200px] bg-gray-50 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
            >
                {surveys.map(s => (
                <option key={s.short_id} value={s.short_id}>
                    {s.payload?.title ? s.payload.title.substring(0, 30) : "Phiếu..."} ({new Date(s.created_at).toLocaleDateString('vi-VN')})
                </option>
                ))}
            </select>
            ) : <div className="text-red-500 text-sm p-2">Chưa có phiếu nào.</div>}
            
            <button onClick={fetchStats} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 border border-indigo-100" title="Làm mới">🔄</button>
        </div>
      </div>

      {/* NỘI DUNG */}
      {loading ? (
        <div className="text-center py-24 text-indigo-500"><p className="text-sm font-bold animate-pulse">Đang tải dữ liệu...</p></div>
      ) : showData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. TỔNG QUAN */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-3xl shadow-lg text-white flex justify-between items-center relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-1">Tổng phiếu</div>
                <div className="text-6xl font-bold">{stats.total || 0}</div>
             </div>
             <div className="relative z-10 text-right">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-2">Cảm xúc chủ đạo</div>
                <div className="text-3xl font-bold bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm inline-block">
                  {stats.sentiment && Object.keys(stats.sentiment).length > 0 ? Object.entries(stats.sentiment).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] : "—"}
                </div>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          {/* 2. CÁC BIỂU ĐỒ (Cảm xúc, Hiểu bài, Điểm nghẽn, Mong muốn) */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex gap-2"><span className="bg-pink-100 p-1 rounded">🎭</span> Cảm xúc</h3>
            {stats.sentiment && Object.keys(stats.sentiment).length > 0 ? Object.entries(stats.sentiment).map(([k, v]) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />) : <p className="text-xs text-gray-400 italic text-center">Chưa có dữ liệu</p>}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex gap-2"><span className="bg-green-100 p-1 rounded">🧠</span> Mức độ hiểu</h3>
            {stats.understanding && Object.keys(stats.understanding).length > 0 ? Object.entries(stats.understanding).map(([k, v]) => <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-emerald-500" />) : <p className="text-xs text-gray-400 italic text-center">Chưa có dữ liệu</p>}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
            <h3 className="font-bold text-red-600 mb-6 flex gap-2"><span className="bg-red-100 p-1 rounded">⚠️</span> Điểm nghẽn</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {stats.gaps && Object.keys(stats.gaps).length > 0 ? Object.entries(stats.gaps).sort((a:any, b:any) => b[1] - a[1]).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="text-xs font-medium text-gray-800 leading-tight max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded shadow-sm">{v}</span>
                  </div>
              )) : <p className="text-xs text-green-600 font-bold text-center py-4">Lớp nắm bài tốt!</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
            <h3 className="font-bold text-blue-600 mb-6 flex gap-2"><span className="bg-blue-100 p-1 rounded">💡</span> Mong muốn</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {stats.wishes && Object.keys(stats.wishes).length > 0 ? Object.entries(stats.wishes).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                    <span className="text-xs text-gray-600 font-medium truncate max-w-[85%]">{k.replace(/[\u{1F600}-\u{1F6FF}]/gu, '')}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v}</span>
                  </div>
              )) : <p className="text-xs text-gray-400 italic text-center py-4">Chưa có dữ liệu</p>}
            </div>
          </div>

          {/* 6. PHẦN LỜI NHẮN & AI PHÂN TÍCH (ĐOẠN MỚI QUAN TRỌNG) */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-100 p-1.5 rounded-lg">💌</span> 
                    Lời nhắn ẩn danh <span className="text-xs font-normal text-gray-400">({stats.feedbacks?.length || 0})</span>
                </h3>
                {/* Nút Kích hoạt AI */}
                {stats.feedbacks?.length > 0 && (
                    <button 
                        onClick={() => analyzeFeedback(stats.feedbacks)}
                        disabled={analyzing}
                        className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition-transform flex items-center gap-2 font-bold"
                    >
                        {analyzing ? "Đang đọc..." : "✨ AI Phân tích & Giải mã"}
                    </button>
                )}
            </div>

            {/* --- HIỂN THỊ KẾT QUẢ AI --- */}
            {aiResult && (
                <div className="mb-6 bg-indigo-50/60 rounded-2xl border border-indigo-100 overflow-hidden animate-fade-in">
                    <div className="p-3 bg-indigo-100/50 flex justify-between items-center border-b border-indigo-200">
                        <span className="text-xs font-bold text-indigo-800 uppercase flex gap-2 items-center">
                            🤖 Kết quả phân tích nhóm
                        </span>
                        <button 
                            onClick={goToSolution} 
                            className="text-xs bg-white text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 shadow-sm flex items-center gap-1 transition-colors"
                        >
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
                                        {item.type === 'negative' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Cần chú ý</span>}
                                    </div>
                                    <p className="text-sm text-gray-800 font-medium leading-snug">{item.summary}</p>
                                    <p className="text-xs text-gray-400 italic mt-1 bg-gray-50 inline-block px-1.5 rounded">"Gốc: {item.original_sample}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LIST TIN NHẮN GỐC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {stats.feedbacks && stats.feedbacks.length > 0 ? stats.feedbacks.map((fb: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 italic border-l-4 border-indigo-400 shadow-sm">"{fb}"</div>
              )) : <p className="text-xs text-gray-400 col-span-2 text-center py-4">Chưa có lời nhắn nào.</p>}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <div className="text-5xl opacity-20 mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu</h3>
            <p className="text-sm text-gray-400 mt-2">Hãy chọn phiếu khác hoặc đợi phản hồi.</p>
        </div>
      )}
    </div>
  );
}