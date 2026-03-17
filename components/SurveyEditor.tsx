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
    if (confirm("⚠️ Hệ thống cảnh báo: Bạn có chắc chắn muốn xóa module câu hỏi này?")) {
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
      text: "[Nhập nội dung truy vấn mới]",
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
      
      {/* TÊN PHIẾU KHẢO SÁT */}
      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group transition-shadow hover:shadow-md">
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
          <span className="text-blue-500">🏷️</span> Định danh Khảo sát
        </label>
        <input
          type="text"
          className="w-full bg-transparent px-3 py-2 text-lg font-extrabold text-slate-800 border-b border-slate-200 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
          value={survey.title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Nhập tên định danh..."
        />
      </div>

      {/* DANH SÁCH CÂU HỎI */}
      <div className="space-y-6 h-[550px] overflow-y-auto pr-3 custom-scrollbar">
        {survey.questions.map((q, qIdx) => (
          <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group transition-all duration-300 hover:border-blue-300 hover:shadow-md">
            
            {/* THANH CÔNG CỤ (HEADER CỦA CÂU HỎI) */}
            <div className="flex flex-wrap lg:flex-nowrap justify-between items-center mb-5 gap-4 pb-4 border-b border-slate-100">
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold text-white bg-blue-600 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                  Module {qIdx + 1}
                </span>
                
                {/* MENU CHỌN LOẠI CÂU HỎI */}
                {q.type !== "text" ? (
                  <select
                    value={q.type || "single_choice"}
                    onChange={(e) => updateQType(qIdx, e.target.value)}
                    className="text-xs font-bold bg-slate-50 text-blue-700 border border-slate-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-slate-100 transition-colors [&>option]:bg-white shadow-inner"
                  >
                    <option value="single_choice">🔘 Chọn Đơn (Single)</option>
                    <option value="multi_choice">☑️ Chọn Nhiều (Multi)</option>
                  </select>
                ) : (
                  <span className="text-xs font-mono bg-slate-50 text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 shadow-inner">
                    📝 Truy vấn Tự luận (Text)
                  </span>
                )}
              </div>

              {/* KHỐI NÚT ĐIỀU KHIỂN: LÊN, XUỐNG, XÓA */}
              <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-inner">
                <button
                  onClick={() => moveQuestionUp(qIdx)}
                  disabled={qIdx === 0}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Dịch chuyển lên"
                >
                  ⬆️
                </button>
                <button
                  onClick={() => moveQuestionDown(qIdx)}
                  disabled={qIdx === survey.questions.length - 1}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Dịch chuyển xuống"
                >
                  ⬇️
                </button>
                <div className="w-px bg-slate-300 mx-1"></div>
                <button
                  onClick={() => removeQuestion(qIdx)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                  title="Tiêu hủy Module"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* NỘI DUNG CÂU HỎI */}
            <textarea
              className="w-full bg-slate-50 px-4 py-3 mb-5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 font-medium text-slate-800 transition-all resize-none shadow-inner"
              rows={2}
              value={q.text}
              onChange={(e) => updateQText(qIdx, e.target.value)}
              placeholder="Nhập tham số truy vấn..."
            />

            {/* CÁC LỰA CHỌN (OPTIONS) */}
            {q.type !== "text" && q.options && (
              <div className="space-y-3 pl-3 border-l-2 border-slate-200 ml-2">
                {q.options.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3 group/opt">
                    <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border transition-colors bg-white ${q.type === "multi_choice" ? "rounded-[4px] border-slate-400 group-hover/opt:border-blue-500" : "rounded-full border-slate-400 group-hover/opt:border-blue-500"}`}>
                       <div className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover/opt:opacity-50 transition-opacity"></div>
                    </div>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-300 outline-none text-slate-700 transition-all font-mono"
                      value={opt}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    />
                    <button onClick={() => removeOption(qIdx, oIdx)} className="text-slate-400 hover:text-red-500 p-2 font-bold transition-colors opacity-0 group-hover/opt:opacity-100" title="Xóa">✕</button>
                  </div>
                ))}
                
                <button
                  onClick={() => addOption(qIdx)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors uppercase tracking-wider border border-blue-100"
                >
                  <span className="text-lg leading-none">+</span> Thêm tham số phụ
                </button>
              </div>
            )}
            
            {/* KHU VỰC TỰ LUẬN */}
            {q.type === "text" && (
              <div className="pl-5 border-l-2 border-slate-200 ml-2">
                <div className="w-full h-20 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400 flex items-center justify-center italic cursor-not-allowed font-mono tracking-wider shadow-inner">
                  [ Vùng đệm để người dùng nhập liệu tự do ]
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-5 border border-dashed border-blue-400 bg-blue-50 text-blue-600 font-extrabold tracking-widest uppercase rounded-2xl hover:bg-blue-100 hover:border-blue-500 transition-all flex justify-center items-center gap-3 hover:shadow-sm"
      >
        <span className="text-2xl font-normal">+</span> KHỞI TẠO MODULE TRUY VẤN MỚI
      </button>
    </div>
  );
}