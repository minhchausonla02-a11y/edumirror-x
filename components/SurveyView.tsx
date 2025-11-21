"use client";
import React from "react";

export interface SurveyV2 {
  type: string;
  title: string;
  questions: any[];
}

export default function SurveyView({ survey }: { survey: SurveyV2 }) {
  if (!survey || !survey.questions) return null;

  return (
    <div className="mx-auto max-w-[360px] bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl border-[6px] border-gray-800 relative overflow-hidden transform scale-90 origin-top">
      {/* Màn hình điện thoại */}
      <div className="bg-[#F8F9FC] rounded-[2rem] overflow-hidden h-[650px] overflow-y-auto no-scrollbar relative scroll-smooth">
        
        {/* Header giả lập */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 pt-10 pb-16 text-white rounded-b-[2rem] shadow-md">
          <div className="text-[9px] opacity-80 uppercase tracking-widest font-bold mb-1 text-center">EduMirror X</div>
          <div className="font-bold text-base leading-tight text-center">{survey.title}</div>
        </div>

        <div className="px-4 -mt-10 space-y-4 pb-10 relative z-10">
          {survey.questions.map((q, idx) => (
            <div key={idx} className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-sm border border-white">
              <div className="flex justify-between items-center mb-2">
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Câu {idx + 1}</span>
                {q.type === "checkbox_dynamic" && <span className="text-[9px] text-orange-500 font-bold flex items-center gap-1">✨ AI</span>}
              </div>
              
              <h4 className="font-bold text-gray-800 text-xs mb-3 leading-normal">{q.text}</h4>

              {/* Render xem trước thu gọn */}
              {q.type === "sentiment" && (
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((o: string, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                      <div className="text-lg">{o.split("|")[0].split(" ")[0]}</div>
                      <div className="text-[9px] font-bold text-gray-500 mt-1">{o.split("|")[0].split(" ")[1]}</div>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "rating" && (
                <div className="space-y-1.5">
                  {q.options.map((o: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-gray-50 border border-transparent text-[10px] text-gray-600">
                      <div className="w-2.5 h-2.5 rounded-full border border-gray-300 bg-white"></div>
                      {o}
                    </div>
                  ))}
                </div>
              )}

              {(q.type.includes("checkbox")) && (
                <div className="space-y-1.5">
                  {q.options.map((o: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-purple-50/40 border border-purple-100 text-[10px] text-purple-900">
                      <div className="w-2.5 h-2.5 rounded border border-purple-300 bg-white"></div>
                      {o}
                    </div>
                  ))}
                </div>
              )}

              {q.type === "text" && (
                <div className="h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center px-3 text-[10px] text-gray-400 italic">
                  Nhập câu trả lời...
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Thanh Home ảo của iPhone */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full opacity-50"></div>
    </div>
  );
}