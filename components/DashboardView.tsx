"use client";
import { useState, useEffect } from "react";

export default function DashboardView() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Tải danh sách phiếu
  useEffect(() => {
    fetch("/api/list-surveys")
      .then((res) => res.json())
      .then((data) => {
        if (data.surveys && data.surveys.length > 0) {
          setSurveys(data.surveys);
          setSelectedId(data.surveys[0].short_id);
        }
      })
      .catch(err => console.error("Lỗi list:", err));
  }, []);

  // 2. Tải chi tiết thống kê
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/survey-summary?id=${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
         console.log("STATS API:", data); // Debug xem dữ liệu về chưa
         if (data.stats) {
            // Ép kiểu dữ liệu để đảm bảo không bị null
            const cleanStats = {
                total: data.stats.total || 0,
                sentiment: data.stats.sentiment || {},
                understanding: data.stats.understanding || {},
                gaps: data.stats.gaps || {},
                wishes: data.stats.wishes || {},
                feedbacks: data.stats.feedbacks || []
            };
            setStats(cleanStats);
         }
      })
      .catch(err => console.error("Lỗi summary:", err))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // Helper: Vẽ thanh Progress
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-700">
          {/* Cắt bớt label nếu quá dài để không bị vỡ giao diện */}
          <span className="truncate max-w-[70%]">{label}</span>
          <span className="text-gray-900 font-bold">{val} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📊 Báo cáo lớp học</h2>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu từ: {stats?.total || 0} học sinh</p>
        </div>
        
        {surveys.length > 0 ? (
          <select 
            className="p-3 border rounded-xl text-sm min-w-[260px] bg-gray-50 font-medium outline-none cursor-pointer"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {surveys.map(s => (
              <option key={s.short_id} value={s.short_id}>
                {s.payload?.title ? s.payload.title.substring(0, 35) : "Phiếu không tên"}...
              </option>
            ))}
          </select>
        ) : <div className="text-red-500 text-sm">Chưa có phiếu nào.</div>}
      </div>

      {loading ? (
        <div className="text-center py-20 text-indigo-500 font-bold animate-pulse">Đang tải dữ liệu...</div>
      ) : stats && stats.total > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Tổng quan */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-3xl shadow-lg text-white flex justify-between items-center">
             <div>
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-1">Tổng phiếu</div>
                <div className="text-6xl font-bold">{stats.total}</div>
             </div>
             <div className="text-right">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-2">Cảm xúc chủ đạo</div>
                <div className="text-4xl font-bold">
                  {Object.keys(stats.sentiment).length > 0 
                    ? Object.entries(stats.sentiment).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] 
                    : "—"}
                </div>
             </div>
          </div>

          {/* Cảm xúc */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">🎭 Cảm xúc</h3>
            {Object.entries(stats.sentiment).map(([k, v]) => (
              <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />
            ))}
          </div>

          {/* Hiểu bài */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">🧠 Hiểu bài</h3>
            {Object.entries(stats.understanding).map(([k, v]) => (
              <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-green-500" />
            ))}
          </div>

          {/* Điểm nghẽn */}
          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
            <h3 className="font-bold text-red-600 mb-4">⚠️ Điểm nghẽn kiến thức</h3>
            <div className="space-y-2">
              {Object.keys(stats.gaps).length > 0 ? (
                Object.entries(stats.gaps).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-2 rounded text-xs">
                    <span className="font-medium text-gray-700 truncate max-w-[80%]">{k}</span>
                    <span className="bg-white px-2 py-0.5 rounded text-red-600 font-bold">{v}</span>
                  </div>
                ))
              ) : <p className="text-xs text-gray-400 italic">Không có điểm nghẽn.</p>}
            </div>
          </div>

          {/* Lời nhắn */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm col-span-1 md:col-span-3">
            <h3 className="font-bold text-gray-800 mb-3">💌 Lời nhắn ẩn danh ({stats.feedbacks.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {stats.feedbacks.map((fb: string, i: number) => (
                <div key={i} className="bg-gray-50 p-3 rounded text-sm text-gray-600 italic border-l-4 border-indigo-400">
                  "{fb}"
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed">
            <div className="text-4xl mb-2">📭</div>
            Chưa có dữ liệu phản hồi nào cho phiếu này.
        </div>
      )}
    </div>
  );
}