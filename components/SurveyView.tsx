// components/SurveyView.tsx
"use client";
import React from "react";

export interface SurveyV2 {
  type: string;
  title: string;
  questions: any[];
}

export default function SurveyView({ survey }: { survey: SurveyV2 }) {
  if (!survey || !survey.questions) return <div className="text-gray-500 italic">Chưa có dữ liệu phiếu...</div>;

  return (
    <div className="bg-gray-50 border rounded-xl overflow-hidden max-w-md mx-auto font-sans shadow-sm">
      {/* Header giả lập điện thoại */}
      <div className="bg-indigo-600 p-4 text-white text-center">
        <div className="text-[10px] opacity-80 uppercase tracking-wider">EduMirror X • 60s Feedback</div>
        <div className="text-lg font-bold mt-1">{survey.title}</div>
      </div>

      <div className="p-4 space-y-4">
        {survey.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            {/* Tiêu đề câu hỏi */}
            <h4 className="font-bold text-gray-800 mb-3 text-sm">
              <span className="text-indigo-600 mr-1">{idx + 1}.</span> 
              {q.text}
            </h4>

            {/* --- RENDER THEO LOẠI CÂU HỎI --- */}
            
            {/* Loại 1: Cảm xúc (Sentiment) */}
            {q.type === "sentiment" && (
              <div className="grid grid-cols-4 gap-2">
                {q.options.map((opt: string, i: number) => (
                  <div key={i} className="flex flex-col items-center justify-center p-2 border rounded bg-gray-50 text-center text-xs opacity-70 grayscale">
                    <span className="text-xl mb-1">{opt.split(" ")[1] || "😐"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loại 2: Rating (Mức độ hiểu) */}
            {q.type === "rating" && (
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                    <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                    <span className="text-sm text-gray-500">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loại 3: Kiến thức ĐỘNG (QUAN TRỌNG: Hiển thị nội dung AI sinh ra) */}
            {q.type === "checkbox_dynamic" && (
              <div className="space-y-2 bg-orange-50/50 p-3 rounded border border-orange-100">
                <div className="text-[10px] text-orange-600 font-bold mb-1 uppercase flex items-center gap-1">
                  🤖 AI Detected Focus:
                </div>
                {q.options.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border border-orange-300 bg-white"></div>
                    <span className="text-sm text-gray-700 font-medium">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loại 4: Quiz (QUAN TRỌNG: Hiển thị câu đố AI) */}
            {q.type === "quiz" && (
               <div className="space-y-2 bg-blue-50/50 p-3 rounded border border-blue-100">
                 <div className="text-[10px] text-blue-600 font-bold mb-1 uppercase flex items-center gap-1">
                  ⚡ 10s Challenge:
                </div>
                {q.quiz_data?.options.map((opt: string, i: number) => (
                   <div key={i} className="p-2 bg-white border border-blue-100 rounded text-sm text-gray-600 shadow-sm">
                     <span className="font-bold text-blue-500 mr-2">{["A", "B", "C", "D"][i]}.</span> {opt}
                   </div>
                ))}
               </div>
            )}

            {/* Loại 5: Text area */}
            {q.type === "text" && (
              <textarea 
                className="w-full border rounded p-2 text-sm h-16 bg-gray-50 resize-none" 
                placeholder={q.placeholder}
                disabled
              />
            )}
          </div>
        ))}
      </div>
      <div className="bg-gray-100 p-2 text-center text-[10px] text-gray-400">
        Màn hình Xem trước (Preview Mode)
      </div>
    </div>
  );
}