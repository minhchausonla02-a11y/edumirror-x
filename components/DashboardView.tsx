"use client";
import { useState, useEffect } from "react";

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">{msg}</div>;
}

export default function DashboardView({ model }: { model?: string }) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // AI State
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- STATE MỚI: CÔNG TẮC LÀM MỜ SỰ THẬT THÔ RÁP ---
  const [showRaw, setShowRaw] = useState(false);

  // 1. Tải danh sách phiếu
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
        }
      })
      .catch(err => console.error("Lỗi tải danh sách:", err));
  };

  useEffect(() => { fetchSurveys(); }, []);

  // 2. Tải chi tiết thống kê
  const fetchStats = () => {
    if (!selectedId) return;
    setLoading(true);
    setAiResult(null);
    setShowRaw(false); // Reset công tắc mỗi khi chuyển phiếu
    
    fetch(`/api/survey-summary?id=${selectedId}&t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
         if (data.stats) setStats(data.stats);
         else setStats(null);
      })
      .catch(err => console.error("Lỗi tải stats:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedId]);

  // --- XÓA PHIẾU ---
  const handleDelete = async () => {
      if (!selectedId) return;
      if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn phiếu này?")) return;

      setDeleting(true);
      try {
          const res = await fetch(`/api/delete-survey?id=${selectedId}`, { method: "DELETE" });
          if (res.ok) {
              alert("Đã xóa thành công!");
              fetchSurveys();
          } else {
              alert("Lỗi khi xóa phiếu.");
          }
      } catch (e) { alert("Lỗi kết nối server."); } 
      finally { setDeleting(false); }
  };

  // --- AI PHÂN TÍCH NHÓM ---
  const analyzeFeedback = async (feedbacks: any[]) => {
    setAnalyzing(true);
    try {
        const savedKey = localStorage.getItem("edumirror_key");
        
        // 💡 LỌC BỎ SOS: Chỉ gửi những phản hồi không phải là SOS cho AI gom nhóm
        const normalFeedbacks = feedbacks.filter(fb => typeof fb !== 'object' || !fb.is_sos);
        const textArray = normalFeedbacks.map(fb => typeof fb === 'object' ? fb.raw_text : fb);
        
        if (textArray.length === 0) {
            alert("Không có phản hồi chuyên môn nào để phân tích nhóm.");
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

  // 💡 TÁCH PHẢN HỒI THÀNH 2 NHÓM: SOS VÀ BÌNH THƯỜNG
  const sosFeedbacks = stats?.feedbacks?.filter((fb: any) => typeof fb === 'object' && fb.is_sos) || [];
  const normalFeedbacks = stats?.feedbacks?.filter((fb: any) => typeof fb !== 'object' || !fb.is_sos) || [];

  return (
    <div className="space-y-8 font-sans animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📊 Báo cáo lớp học</h2>
          <p className="text-sm text-gray-500 mt-1">{stats ? `Dữ liệu từ ${stats.total} học sinh` : "Chọn phiếu để xem"}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto items-center">
            {surveys.length > 0 ? (
            <>
                <select 
                    className="flex-1 p-3 border rounded-xl text-sm min-w-[200px] bg-gray-50 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                >
                    {surveys.map(s => (
                    <option key={s.short_id} value={s.short_id}>
                        {s.payload?.title ? s.payload.title.substring(0, 30) : "Phiếu..."} ({new Date(s.created_at).toLocaleString('vi-VN', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
})})
                    </option>
                    ))}
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
          
          {/* CÁC BLOCK 1 ĐẾN 6 GIỮ NGUYÊN HOÀN TOÀN */}
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

          {/* ========================================================= */}
          {/* 7. LỜI NHẮN & AI - ĐÃ NÂNG CẤP LĂNG KÍNH THẤU CẢM & SOS */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            
            {/* 🚨 KHU VỰC BÁO ĐỘNG ĐỎ (SOS) - CHỈ HIỆN KHI CÓ NGƯỜI CẦU CỨU */}
            {sosFeedbacks.length > 0 && (
              <div className="mb-6 bg-red-50 border-l-[6px] border-red-600 p-5 rounded-r-xl shadow-md animate-pulse">
                <h4 className="text-red-800 font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wide">
                  <span className="text-2xl">🚨</span> Cảnh báo tâm lý khẩn cấp (SOS)
                </h4>
                <p className="text-xs text-red-600 mb-4 font-medium">
                  Hệ thống AI phát hiện các nội dung có dấu hiệu bạo lực học đường, tổn thương tâm lý hoặc xâm phạm đời tư. Vui lòng lưu ý và can thiệp kịp thời!
                </p>
                <div className="space-y-3">
                  {sosFeedbacks.map((fb: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl text-red-800 text-sm font-bold border border-red-200 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                      "{fb.raw_text}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    💌 Lời nhắn ẩn danh ({normalFeedbacks.length})
                  </h3>
                  
                  {/* CÔNG TẮC LÀM MỜ (TOGGLE) */}
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

                {normalFeedbacks.length > 0 && (
                    <button onClick={() => analyzeFeedback(stats.feedbacks)} disabled={analyzing} className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition-all font-bold">
                        {analyzing ? "Đang đọc..." : "✨ AI Phân tích Nhóm"}
                    </button>
                )}
            </div>

            {/* Khối AI Nhóm (Giữ nguyên) */}
            {aiResult && (
                <div className="mb-6 bg-indigo-50/60 rounded-2xl border border-indigo-100 overflow-hidden animate-fade-in">
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

            {/* KHU VỰC HIỂN THỊ LỜI NHẮN CHUYÊN MÔN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {normalFeedbacks.length > 0 ? normalFeedbacks.map((fb: any, i: number) => {
                  
                  // Nhận diện dữ liệu kiểu cũ (chỉ là chuỗi) hoặc kiểu mới (có AI phân tích)
                  const isObject = typeof fb === 'object' && fb !== null;
                  const isHarsh = isObject ? fb.is_harsh : false;
                  
                  // Quyết định xem text nào
                  let textToDisplay = fb; // Mặc định nếu là chuỗi cũ
                  if (isObject) {
                      if (isHarsh && !showRaw) {
                          textToDisplay = fb.ai_summary || fb.raw_text; // Hiện bản tóm tắt mô phạm
                      } else {
                          textToDisplay = fb.raw_text; // Hiện bản gốc
                      }
                  }

                  // Giao diện (Làm mờ nếu đang giấu sự thật)
                  const isHiddenHarsh = isHarsh && !showRaw;
                  const isExposedHarsh = isHarsh && showRaw;

                  return (
                    <div key={i} className={`p-3.5 rounded-xl text-xs transition-all duration-300 border-l-4 
                        ${isHiddenHarsh ? 'bg-gray-50 border-gray-300 text-gray-500 opacity-90' : ''}
                        ${isExposedHarsh ? 'bg-red-50 border-red-500 text-red-800 shadow-sm' : ''}
                        ${!isHarsh ? 'bg-white border-indigo-200 text-gray-700 shadow-sm' : ''}
                    `}>
                        {isHiddenHarsh && <span className="mr-2 inline-block bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold not-italic">🛡️ AI Đã dịch</span>}
                        {isExposedHarsh && <span className="mr-2 inline-block bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold not-italic animate-pulse">🔥 Gốc</span>}
                        
                        <span className={`italic leading-relaxed ${isHiddenHarsh ? 'blur-[0.5px]' : ''}`}>"{textToDisplay}"</span>
                    </div>
                  );
              }) : <EmptyState msg="Chưa có lời nhắn nào" />}
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