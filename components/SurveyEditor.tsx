"use client";
import React from "react";
import { SurveyV2 } from "./SurveyView";

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

  // Đổi loại câu hỏi (Chỉ giữa 1 Lựa chọn và Nhiều lựa chọn)
  const updateQType = (idx: number, newType: string) => {
    const qs = [...survey.questions];
    qs[idx].type = newType;
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

  // Thêm câu hỏi mới (Mặc định là Trắc nghiệm 1 lựa chọn)
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

  // ==========================================
  // HÀM ĐẨY CÂU HỎI LÊN/XUỐNG
  // ==========================================
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
          <div key={q.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group">
            
            {/* NHÓM NÚT ĐIỀU KHIỂN: LÊN, XUỐNG, XÓA */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white pl-2 z-10">
              <button
                onClick={() => moveQuestionUp(qIdx)}
                disabled={qIdx === 0}
                className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-lg"
                title="Đẩy lên"
              >
                ⬆️
              </button>
              <button
                onClick={() => moveQuestionDown(qIdx)}
                disabled={qIdx === survey.questions.length - 1}
                className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-lg"
                title="Đẩy xuống"
              >
                ⬇️
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1 mt-1"></div>
              <button
                onClick={() => removeQuestion(qIdx)}
                className="text-red-400 hover:text-red-600 text-lg"
                title="Xóa câu hỏi này"
              >
                🗑️
              </button>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-500">Câu {qIdx + 1}</label>
              
              {/* NẾU LÀ CÂU TRẮC NGHIỆM THÌ HIỆN DROPDOWN (1 LỰA CHỌN / NHIỀU LỰA CHỌN) */}
              {q.type !== "text" ? (
                <select
                  value={q.type || "single_choice"}
                  onChange={(e) => updateQType(qIdx, e.target.value)}
                  className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-indigo-100"
                >
                  <option value="single_choice">🔘 1 Lựa chọn</option>
                  <option value="multi_choice">☑️ Nhiều lựa chọn</option>
                </select>
              ) : (
                /* NẾU LÀ CÂU TỰ LUẬN THÌ CHỈ HIỆN CHỮ, KHÔNG CHO ĐỔI KIỂU */
                <span className="text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 rounded-lg px-2 py-1">
                  📝 Tự luận (Điền tự do)
                </span>
              )}
            </div>

            <input
              type="text"
              className="w-full px-3 py-2 mb-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:border-blue-400 font-semibold text-gray-800"
              value={q.text}
              onChange={(e) => updateQText(qIdx, e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
            />

            {/* CHỈ HIỆN CÁC LỰA CHỌN (OPTIONS) KHI KHÔNG PHẢI LÀ CÂU TỰ LUẬN */}
            {q.type !== "text" && q.options && (
              <div className="space-y-2 pl-4 border-l-2 border-indigo-100">
                {q.options.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className={q.type === "multi_choice" ? "text-indigo-300 text-lg" : "text-gray-300"}>
                      {q.type === "multi_choice" ? "□" : "○"}
                    </span>
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
            
            {/* VẪN GIỮ NGUYÊN Ô HIỂN THỊ TỰ LUẬN NHƯ YÊU CẦU CỦA BẠN */}
            {q.type === "text" && (
              <div className="pl-4 border-l-2 border-gray-100">
                <div className="w-full h-10 bg-gray-50 border border-dashed border-gray-200 rounded text-xs text-gray-400 flex items-center px-3 italic cursor-not-allowed">
                  Khu vực học sinh gõ câu trả lời...
                </div>
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