"use client";
import { useState } from "react";

export default function AISuggestionsView({ lessonText, analysis, apiKey, model }: any) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGetAdvice = async () => {
    if (!apiKey) { alert("Chưa có API Key"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/get-ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-proxy-key": apiKey },
        body: JSON.stringify({ lessonText, analysis, model }),
      });
      const data = await res.json();
      setResult(data.suggestion);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  if (!result) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-3xl border border-indigo-100">
        <div className="text-6xl mb-6 animate-bounce">🔮</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Kích hoạt "Trợ lý Kiến tạo Sư phạm"</h3>
        <p className="text-gray-600 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
          Hệ thống sẽ thực hiện 3 tầng xử lý: <br/>
          <b>1. Soi gương</b> (Phát hiện độ lệch dạy-học) <br/>
          <b>2. Cứu trợ</b> (Tạo ví dụ & bài tập gỡ rối) <br/>
          <b>3. Tâm lý</b> (Viết kịch bản điều phối cảm xúc)
        </p>
        <button onClick={handleGetAdvice} disabled={loading} 
          className="px-10 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-105 disabled:opacity-70 flex items-center gap-3 mx-auto">
          {loading ? <span className="animate-spin">⚙️</span> : "✨"} 
          {loading ? "Đang kiến tạo giải pháp..." : "Bắt đầu Phân tích & Kiến tạo"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* TẦNG 1: SOI GƯƠNG (GAP ANALYSIS) */}
      <div className="bg-white border-l-4 border-orange-500 shadow-md rounded-r-xl p-6">
        <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          🪞 Tầng 1: Soi gương (Gap Analysis)
        </h3>
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-orange-50 p-4 rounded-lg">
                <p className="text-xs text-orange-800 font-bold uppercase mb-1">Giáo viên (Kỳ vọng)</p>
                <p className="text-gray-800 font-medium">"{result.gap_analysis?.teacher_intent}"</p>
            </div>
            <div className="flex items-center justify-center text-gray-400">⚡ Độ lệch ⚡</div>
            <div className="flex-1 bg-red-50 p-4 rounded-lg">
                <p className="text-xs text-red-800 font-bold uppercase mb-1">Học sinh (Thực tế)</p>
                <p className="text-gray-800 font-medium">"{result.gap_analysis?.student_reality}"</p>
            </div>
        </div>
        <div className="mt-4 text-sm text-gray-600 italic border-t pt-3">
            💡 <b>Insight:</b> {result.gap_analysis?.insight}
        </div>
      </div>

      {/* TẦNG 2: GÓI CỨU TRỢ (RESCUE KIT) */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          🛠️ Tầng 2: Gói Cứu Trợ Kiến Thức
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.rescue_kit?.map((item: any, idx: number) => (
                <div key={idx} className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="mb-3">
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase">
                            {item.type === 'metaphor' ? 'Ẩn dụ' : item.type === 'mistake_fix' ? 'Sửa sai' : 'Bài tập'}
                        </span>
                    </div>
                    <h4 className="font-bold text-gray-800 mb-2">{item.title}</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-line flex-grow">
                        {item.content}
                    </div>
                    <button 
                        onClick={() => navigator.clipboard.writeText(item.content)}
                        className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start"
                    >
                        📋 Copy
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* TẦNG 3: KỊCH BẢN CẢM XÚC (EMOTIONAL SCRIPT) */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h3 className="text-sm font-bold uppercase opacity-90 mb-4 flex items-center gap-2">
          🎭 Tầng 3: Kịch bản Điều phối Cảm xúc
        </h3>
        <div className="flex items-start gap-4">
            <div className="text-4xl bg-white/20 p-3 rounded-full">🗣️</div>
            <div>
                <div className="flex gap-3 mb-2">
                    <span className="bg-black/30 px-3 py-1 rounded-full text-xs">Mood: {result.emotional_script?.mood_detected}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">Action: {result.emotional_script?.activity_name}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 font-mono text-sm leading-relaxed italic">
                    "{result.emotional_script?.script_content}"
                </div>
                <p className="text-xs mt-2 opacity-80">*Giáo viên có thể dùng đoạn thoại này để mở đầu tiết sau.</p>
            </div>
        </div>
      </div>

      <div className="text-center pt-8">
        <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600 text-sm underline">
            Phân tích lại với dữ liệu mới
        </button>
      </div>
    </div>
  );
}