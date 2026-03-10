"use client";
import React from "react";
import { SurveyV2 } from "./SurveyView";

type Props = {
  survey: SurveyV2;
  setSurvey: (s: SurveyV2) => void;
};

export default function SurveyEditor({ survey, setSurvey }: Props) {
  if (!survey) return null;

  const updateTitle = (val: string) => setSurvey({ ...survey, title: val });

  const updateQText = (idx: number, val: string) => {
    const qs = [...survey.questions];
    qs[idx].text = val;
    setSurvey({ ...survey, questions: qs });
  };

  const updateQType = (idx: number, newType: string) => {
    const qs = [...survey.questions];
    qs[idx].type = newType;
    setSurvey({ ...survey, questions: qs });
  };

  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || [])];
    newOpts[oIdx] = val;
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  const addOption = (qIdx: number) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || []), "Lựa chọn mới"];
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const qs = [...survey.questions];
    const newOpts = [...(qs[qIdx].options || [])];
    newOpts.splice(oIdx, 1);
    qs[qIdx].options = newOpts;
    setSurvey({ ...survey, questions: qs });
  };

  const removeQuestion = (qIdx: number) => {
    if (confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
      const qs = [...survey.questions];
      qs.splice(qIdx, 1);
      setSurvey({ ...survey, questions: qs });
    }
  };

  const addQuestion = () => {
    const qs = [...survey.questions];
    qs.push({
      id: `q_custom_${Date.now()}`,
      type: "single_choice", 
      text: "Câu hỏi mới của bạn là gì?",
      options: ["Lựa chọn 1", "Lựa chọn 2"],
    });
    setSurvey({ ...survey, questions: qs });
  };

  const moveQuestionUp = (qIdx: number) => {
    if (qIdx === 0) return;
    const qs = [...survey.questions];
    const temp = qs[qIdx - 1];
    qs[qIdx - 1] = qs[qIdx];
    qs[qIdx] = temp;
    setSurvey({ ...survey, questions: qs });
  };

  const moveQuestionDown = (qIdx: number) => {
    if (qIdx === survey.questions.length - 1) return;
    const qs = [...survey.questions];
    const temp = qs[qIdx + 1];
    qs[qIdx + 1] = qs[qIdx];
    qs[qIdx] = temp;
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
          <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group transition-all duration-200 hover:shadow-md">
            
            {/* THANH CÔNG CỤ (HEADER CỦA CÂU HỎI) */}
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center mb-4 gap-3 pb-3 border-b border-gray-100">
              <label className="text-sm font-extrabold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                Câu {qIdx + 1}
              </label>
              
              <div className="flex items-center gap-2">
                {/* MENU CHỌN LOẠI CÂU HỎI */}
                {q.type !== "text" ? (
                  <select
                    value={q.type || "single_choice"}
                    onChange={(e) => updateQType(qIdx, e.target.value)}
                    className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                  >
                    <option value="single_choice">🔘 1 Lựa chọn</option>
                    <option value="multi_choice">☑️ Nhiều lựa chọn</option>
                  </select>
                ) : (
                  <span className="text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5">
                    📝 Tự luận (Điền tự do)
                  </span>
                )}

                {/* KHỐI NÚT ĐIỀU KHIỂN: LÊN, XUỐNG, XÓA */}
                <div className="flex bg-gray-50 rounded-lg border border-gray-200 p-1 shadow-sm">
                  <button
                    onClick={() => moveQuestionUp(qIdx)}
                    disabled={qIdx === 0}
                    className="px-2 py-1 rounded text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Đẩy lên"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => moveQuestionDown(qIdx)}
                    disabled={qIdx === survey.questions.length - 1}
                    className="px-2 py-1 rounded text-gray-500 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Đẩy xuống"
                  >
                    ⬇️
                  </button>
                  <div className="w-px bg-gray-300 mx-1"></div>
                  <button
                    onClick={() => removeQuestion(qIdx)}
                    className="px-2 py-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Xóa câu hỏi này"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            {/* NỘI DUNG CÂU HỎI */}
            <input
              type="text"
              className="w-full px-3 py-2 mb-4 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:border-indigo-400 font-semibold text-gray-800 transition-all"
              value={q.text}
              onChange={(e) => updateQText(qIdx, e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
            />

            {/* CÁC LỰA CHỌN (OPTIONS) */}
            {q.type !== "text" && q.options && (
              <div className="space-y-2 pl-2 md:pl-4 border-l-2 border-indigo-100">
                {q.options.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className={q.type === "multi_choice" ? "text-indigo-400 text-lg" : "text-gray-300"}>
                      {q.type === "multi_choice" ? "□" : "○"}
                    </span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-300 outline-none transition-all"
                      value={opt}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    />
                    <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-300 hover:text-red-500 p-2 font-bold transition-colors">✕</button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(qIdx)}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-700 mt-2 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                >
                  + Thêm lựa chọn
                </button>
              </div>
            )}
            
            {/* KHU VỰC TỰ LUẬN */}
            {q.type === "text" && (
              <div className="pl-4 border-l-2 border-gray-100">
                <div className="w-full h-12 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 flex items-center px-4 italic cursor-not-allowed">
                  Khu vực học sinh gõ câu trả lời sẽ xuất hiện ở đây...
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 hover:border-indigo-400 transition-all flex justify-center items-center gap-2"
      >
        <span className="text-xl">+</span> Thêm Câu Hỏi Mới
      </button>
    </div>
  );
}