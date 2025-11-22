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
          // Nếu chưa chọn phiếu nào thì chọn phiếu mới nhất
          if (!selectedId) setSelectedId(data.surveys[0].short_id);
        }
      })
      .catch(err => console.error("Lỗi list:", err));
  }, []);

  // Hàm tải dữ liệu chi tiết
  const fetchStats = () => {
    if (!selectedId) return;
    setLoading(true);
    // Thêm t=... để tránh cache trình duyệt
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
         console.log("Dữ liệu về:", data);
         if (data.stats) setStats(data.stats);
      })
      .catch(err => console.error("Lỗi summary:", err))
      .finally(() => setLoading(false));
  };

  // 2. Gọi hàm tải khi chọn phiếu
  useEffect(() => {
    fetchStats();
  }, [selectedId]);

  // Helper: Thanh Progress
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-4 last:mb-0 group">
        <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-700">
          <span className="truncate max-w-[75%]" title={label}>{label}</span>
          <span className="text-gray-900 font-bold">{val} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${color} transition-all duration-700 group-hover:opacity-80`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-10">
      
      {/* Header & Bộ lọc */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📊 Báo cáo lớp học
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {stats ? `Dữ liệu từ ${stats.total} học sinh` : "Chọn phiếu để xem"}
          </p>
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
                    {s.payload?.title ? s.payload.title.substring(0, 35) : "Phiếu không tên"} ({new Date(s.created_at).toLocaleDateString('vi-VN')})
                </option>
                ))}
            </select>
            ) : <div className="text-red-500 text-sm p-2">Chưa có phiếu nào.</div>}
            
            <button 
                onClick={fetchStats} 
                className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                title="Làm mới dữ liệu"
            >
                🔄
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-indigo-500">
            <div className="inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm font-bold">Đang phân tích dữ liệu...</p>
        </div>
      ) : stats && stats.total > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. THẺ TỔNG QUAN */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-3xl shadow-lg text-white flex flex-col sm:flex-row justify-between items-center relative overflow-hidden">
             <div className="relative z-10 text-center sm:text-left">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-1">Tổng phiếu thu về</div>
                <div className="text-6xl font-bold tracking-tight">{stats.total}</div>
             </div>
             <div className="mt-4 sm:mt-0 text-center sm:text-right relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-2">Cảm xúc chủ đạo</div>
                <div className="text-3xl font-bold bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm inline-block">
                  {/* Logic tìm cảm xúc cao nhất */}
                  {Object.keys(stats.sentiment).length > 0 
                    ? Object.entries(stats.sentiment).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] 
                    : "—"}
                </div>
             </div>
             {/* Background Decor */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          {/* 2. CẢM XÚC */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
               <span className="bg-pink-100 text-pink-600 p-1.5 rounded-lg text-sm">🎭</span> Cảm xúc
            </h3>
            {Object.keys(stats.sentiment).length > 0 ? (
                Object.entries(stats.sentiment).map(([k, v]) => (
                  <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-pink-500" />
                ))
            ) : <p className="text-xs text-gray-400 italic text-center py-4">Chưa có dữ liệu</p>}
          </div>

          {/* 3. MỨC ĐỘ HIỂU BÀI */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-1.5 rounded-lg text-sm">🧠</span> Mức độ hiểu
            </h3>
            {Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding).map(([k, v]) => (
                  <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-emerald-500" />
                ))
            ) : <p className="text-xs text-gray-400 italic text-center py-4">Chưa có dữ liệu</p>}
          </div>

          {/* 4. ĐIỂM NGHẼN KIẾN THỨC */}
          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-8 -mt-8"></div>
            <h3 className="font-bold text-red-600 mb-5 flex items-center gap-2 relative z-10">
                <span className="bg-red-100 p-1.5 rounded-lg text-sm">⚠️</span> Điểm nghẽn
            </h3>
            <div className="space-y-3 relative z-10 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(stats.gaps).length > 0 ? (
                Object.entries(stats.gaps)
                  .sort((a:any, b:any) => b[1] - a[1]) // Sắp xếp
                  .map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="text-xs font-medium text-gray-800 leading-tight max-w-[80%]">{k}</span>
                    <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded shadow-sm">
                      {v}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                    <div className="text-3xl mb-1">🎉</div>
                    <p className="text-xs text-green-600 font-bold">Lớp nắm bài rất tốt!</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. MONG MUỐN */}
          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
            <h3 className="font-bold text-blue-600 mb-5 flex items-center gap-2">
                <span className="bg-blue-100 p-1.5 rounded-lg text-sm">💡</span> Mong muốn
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {Object.keys(stats.wishes).length > 0 ? (
                  Object.entries(stats.wishes).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                      <span className="text-xs text-gray-600 font-medium">{k.replace(/[\u{1F600}-\u{1F6FF}]/gu, '')}</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v}</span>
                    </div>
                  ))
              ) : <p className="text-xs text-gray-400 italic text-center py-4">Chưa có dữ liệu</p>}
            </div>
          </div>

          {/* 6. LỜI NHẮN ẨN DANH */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-gray-100 text-gray-600 p-1.5 rounded-lg text-sm">💌</span> 
                Lời nhắn ẩn danh <span className="text-xs font-normal text-gray-400">({stats.feedbacks.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {stats.feedbacks.length > 0 ? (
                stats.feedbacks.map((fb: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic border-l-4 border-indigo-400 shadow-sm">
                    "{fb}"
                  </div>
                ))
              ) : <p className="text-xs text-gray-400 col-span-2 text-center py-4">Chưa có lời nhắn nào.</p>}
            </div>
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