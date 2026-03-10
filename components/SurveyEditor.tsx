"use client";
import React from "react";
import { SurveyV2 } from "./SurveyView"; // Import type từ file cũ

type Props = {
  survey: SurveyV2;
  setSurvey: (s: SurveyV2) => void;
};

export default function SurveyEditor({ survey, setSurvey }: Props) {
  if (!survey) return null;

  // Sửa tiêu đề
  const updateTitle = (val: string) => setSurvey({ ...survey, title: val });

  // Sửa nội dung câu hỏi
  const updateQText = (idx: number, val: string) => {
    const qs = [...survey.questions];
    qs[idx].text = val;
    setSurvey({ ...survey, questions: qs });
  };

  // Sửa lựa chọn (Option)
  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || [])];
    newOpts[oIdx] = val;
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  // Thêm lựa chọn mới
  const addOption = (qIdx: number) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || []), "Lựa chọn mới"];
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  // Xóa lựa chọn
  const removeOption = (qIdx: number, oIdx: number) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || [])];
    newOpts.splice(oIdx, 1);
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  // Xóa nguyên câu hỏi
  const removeQuestion = (qIdx: number) => {
    if (confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
      const qs = [...survey.questions];
      qs.splice(qIdx, 1);
      setSurvey({ ...survey, questions: qs });
    }
  };

  // Thêm câu hỏi mới
  const addQuestion = () => {
    const qs = [...survey.questions];
    qs.push({
      id: `q_custom_${Date.now()}`,
      type: "multi_choice",
      text: "Câu hỏi mới của bạn là gì?",
      options: ["Lựa chọn A", "Lựa chọn B"],
    });
    setSurvey({ ...survey, questions: qs });
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">Tên Phiếu Khảo Sát</label>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-800"
          value={survey.title}
          onChange={(e) => updateTitle(e.target.value)}
        />
      </div>

      <div className="space-y-6 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {survey.questions.map((q, qIdx) => (
          <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group">
            <button
              onClick={() => removeQuestion(qIdx)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Xóa câu hỏi này"
            >
              🗑️ Xóa
            </button>
            
            <label className="block text-xs font-bold text-gray-500 mb-1">Câu {qIdx + 1} ({q.type === "text" ? "Tự luận" : "Trắc nghiệm"})</label>
            <input
              type="text"
              className="w-full px-3 py-2 mb-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:border-blue-400 font-semibold text-gray-800"
              value={q.text}
              onChange={(e) => updateQText(qIdx, e.target.value)}
            />

            {q.options && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="text-gray-300">○</span>
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 text-sm rounded bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-gray-300 outline-none transition-all"
                      value={opt}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    />
                    <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-300 hover:text-red-500 px-2">×</button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(qIdx)}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-700 mt-2 flex items-center gap-1"
                >
                  + Thêm lựa chọn
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-indigo-400 hover:text-indigo-600 transition-all"
      >
        + Thêm Câu Hỏi Mới
      </button>
    </div>
  );
}