"use client";

import { useState } from "react";

export default function AISuggestionsView({ lessonText, analysis, apiKey, model }: any) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGetAdvice = async () => {
    if (!apiKey) { alert("Vui lòng nhập API Key ở trên trước."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/get-ai-suggestions", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "x-proxy-key": apiKey // Gửi Key đi
        },
        body: JSON.stringify({ lessonText, analysis, model }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.suggestion);
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 text-6xl">🤖</div>
        <h3 className="text-xl font-bold text-gray-800">Trợ lý Sư phạm EduMirror X</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Hệ thống sẽ phân tích nội dung bài học và dữ liệu phản hồi để đề xuất chiến lược dạy học tối ưu nhất cho tiết sau.
        </p>
        <button
          onClick={handleGetAdvice}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {loading ? "Đang suy nghĩ..." : "✨ Phân tích & Đề xuất ngay"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Chẩn đoán */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-md">
        <h3 className="text-sm font-bold uppercase opacity-80 mb-1">🩺 Chẩn đoán Lớp học</h3>
        <p className="text-2xl font-bold mb-2">"{result.diagnosis?.summary}"</p>
        <div className="flex gap-3 mt-3 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">Cảm xúc: {result.diagnosis?.mood}</span>
            <span className="bg-red-500/80 px-3 py-1 rounded-full">⚠️ {result.diagnosis?.urgent_issue}</span>
        </div>
      </div>

      {/* 2. Chiến lược */}
      <h3 className="text-lg font-bold text-gray-800 mt-6">🎯 Chiến lược điều chỉnh (Kê đơn)</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {result.strategies?.map((strat: any, idx: number) => (
          <div key={idx} className="border border-gray-200 bg-white p-5 rounded-xl hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-indigo-700">{strat.title}</h4>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{strat.code}</span>
            </div>
            <p className="text-gray-700 text-sm mb-3">{strat.action}</p>
            <div className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded">
              💡 Lý do: {strat.reason}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Hoạt động */}
      {result.suggested_activity && (
          <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 rounded-xl">
            <h3 className="text-indigo-800 font-bold mb-3 flex items-center gap-2">
                🎲 Hoạt động đề xuất: {result.suggested_activity.name}
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                {result.suggested_activity.steps?.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                ))}
            </ul>
          </div>
      )}

      <div className="text-center pt-4">
        <button onClick={() => setResult(null)} className="text-sm text-gray-500 hover:text-indigo-600 underline">
            Phân tích lại
        </button>
      </div>
    </div>
  );
}