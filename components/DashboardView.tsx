"use client";
import { useState, useEffect } from "react";

export default function DashboardView() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. Tải danh sách các phiếu đã tạo (Dropdown)
  useEffect(() => {
    fetch("/api/list-surveys")
      .then((res) => res.json())
      .then((data) => {
        if (data.surveys && data.surveys.length > 0) {
          setSurveys(data.surveys);
          // Mặc định chọn phiếu mới nhất
          setSelectedId(data.surveys[0].short_id);
        }
      })
      .catch(err => console.error("Lỗi tải danh sách:", err));
  }, []);

  // 2. Tải số liệu chi tiết khi chọn phiếu
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/survey-summary?id=${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
         if(data.stats) setStats(data.stats);
      })
      .catch(err => console.error("Lỗi tải số liệu:", err))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // Component con: Thanh tiến trình (Progress Bar)
  const ProgressBar = ({ label, val, total, color }: any) => {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-700">
          <span>{label}</span>
          <span className="text-gray-900 font-bold">{val} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* --- HEADER & BỘ LỌC --- */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            📊 Báo cáo lớp học
          </h2>
          <p className="text-sm text-gray-500 mt-1">Phân tích dữ liệu thời gian thực từ học sinh</p>
        </div>
        
        {surveys.length > 0 ? (
          <div className="relative">
            <select 
              className="appearance-none p-3 pl-4 pr-10 border border-gray-200 rounded-xl text-sm min-w-[260px] bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-white"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {surveys.map(s => (
                <option key={s.short_id} value={s.short_id}>
                  {s.payload?.title ? s.payload.title.substring(0, 35) : "Phiếu không tên"}... ({new Date(s.created_at).toLocaleDateString('vi-VN')})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        ) : (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full">Chưa có dữ liệu phiếu.</div>
        )}
      </div>

      {/* --- NỘI DUNG CHÍNH --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-60">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-600 text-sm font-bold tracking-wider uppercase">Đang tổng hợp dữ liệu...</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. THẺ TỔNG QUAN (CARD LỚN) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-1">Tổng phiếu thu về</div>
                <div className="text-6xl font-bold">{stats.total}</div>
                <div className="mt-2 text-sm opacity-90 bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                  Cập nhật liên tục
                </div>
             </div>
             <div className="text-right mt-4 md:mt-0 relative z-10">
                <div className="text-xs opacity-80 uppercase font-bold tracking-widest mb-2">Cảm xúc chủ đạo</div>
                <div className="text-4xl font-bold flex items-center justify-end gap-2">
                  {/* Logic tìm cảm xúc cao nhất */}
                  <span>
                    {Object.entries(stats.sentiment).length > 0 
                      ? Object.entries(stats.sentiment).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] 
                      : "—"}
                  </span>
                </div>
             </div>
             {/* Họa tiết trang trí nền */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-yellow-300 opacity-20 rounded-full blur-2xl"></div>
          </div>

          {/* 2. BIỂU ĐỒ CẢM XÚC */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-pink-100 text-pink-600 w-8 h-8 flex items-center justify-center rounded-lg text-lg">🎭</span> 
              Cảm xúc lớp học
            </h3>
            {Object.keys(stats.sentiment).length > 0 ? (
                Object.entries(stats.sentiment).map(([k, v]) => (
                  <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-gradient-to-r from-pink-400 to-rose-500" />
                ))
            ) : <EmptyState msg="Chưa có dữ liệu cảm xúc" />}
          </div>

          {/* 3. MỨC ĐỘ HIỂU BÀI */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-600 w-8 h-8 flex items-center justify-center rounded-lg text-lg">🧠</span> 
              Mức độ hiểu bài
            </h3>
            {Object.keys(stats.understanding).length > 0 ? (
                Object.entries(stats.understanding).map(([k, v]) => (
                  <ProgressBar key={k} label={k} val={v} total={stats.total} color="bg-gradient-to-r from-emerald-400 to-teal-500" />
                ))
            ) : <EmptyState msg="Chưa đánh giá mức độ hiểu" />}
          </div>

          {/* 4. ĐIỂM NGHẼN KIẾN THỨC (QUAN TRỌNG) */}
          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
            <h3 className="font-bold text-red-600 mb-6 flex items-center gap-2 relative z-10">
              <span className="bg-red-100 text-red-600 w-8 h-8 flex items-center justify-center rounded-lg text-lg">⚠️</span> 
              Điểm nghẽn kiến thức
            </h3>
            <div className="space-y-3 relative z-10">
              {Object.keys(stats.gaps).length > 0 ? (
                Object.entries(stats.gaps)
                  .sort((a:any, b:any) => b[1] - a[1]) // Sắp xếp cái khó nhất lên đầu
                  .map(([k, v]: any) => (
                  <div key={k} className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="text-sm font-medium text-gray-800">{k}</span>
                    <span className="text-xs font-bold bg-white text-red-600 px-2.5 py-1 rounded-md shadow-sm border border-red-100">
                      {v} HS
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-sm text-green-700 font-bold">Tuyệt vời! Không có lỗ hổng.</p>
                    <p className="text-xs text-green-600 mt-1">Lớp nắm bài rất tốt.</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. MONG MUỐN & LỜI NHẮN (GỘP 2 CỘT) */}
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Mong muốn */}
            <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                <h3 className="font-bold text-blue-600 mb-5 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-lg text-lg">💡</span> 
                Mong muốn tiết sau
                </h3>
                <div className="space-y-3">
                {Object.keys(stats.wishes).length > 0 ? (
                    Object.entries(stats.wishes).map(([k, v]: any) => (
                        <div key={k} className="flex justify-between items-center p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                        <span className="text-sm text-gray-700 font-medium">{k}</span>
                        <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded shadow-sm">{v} phiếu</span>
                        </div>
                    ))
                ) : <EmptyState msg="Chưa có đề xuất nào" />}
                </div>
            </div>

            {/* Lời nhắn */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="bg-gray-100 text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg text-lg">💌</span> 
                Lời nhắn ẩn danh <span className="text-xs font-normal text-gray-400 ml-1">({stats.feedbacks.length})</span>
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {stats.feedbacks.length > 0 ? (
                    stats.feedbacks.map((fb: string, i: number) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic border-l-4 border-indigo-400 shadow-sm">
                        "{fb}"
                    </div>
                    ))
                ) : <EmptyState msg="Hòm thư góp ý đang trống" />}
                </div>
            </div>
          </div>

        </div>
      ) : (
        // Trạng thái trống (Chưa chọn phiếu hoặc chưa có phiếu)
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <div className="text-6xl opacity-20 mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu báo cáo</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">Hãy tạo phiếu khảo sát mới, mời học sinh quét mã QR và quay lại đây xem kết quả nhé!</p>
        </div>
      )}
    </div>
  );
}

// Component phụ cho trạng thái trống
function EmptyState({ msg }: { msg: string }) {
    return <p className="text-xs text-gray-400 italic text-center py-4">{msg}</p>;
}