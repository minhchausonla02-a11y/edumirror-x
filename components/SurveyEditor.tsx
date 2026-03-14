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
    if (confirm("⚠️ Hệ thống cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn module câu hỏi này?")) {
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
      <div className="bg-[#05050A] p-5 rounded-2xl border border-purple-500/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden group">
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 shadow-[0_0_15px_#a855f7]"></div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
          <span className="text-purple-400">🏷️</span> Định danh Khảo sát
        </label>
        <input
          type="text"
          className="w-full bg-transparent px-3 py-2 text-lg font-extrabold text-gray-200 border-b border-white/10 outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
          value={survey.title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Nhập tên định danh..."
        />
      </div>

      {/* DANH SÁCH CÂU HỎI */}
      <div className="space-y-6 h-[550px] overflow-y-auto pr-3 custom-scrollbar">
        {survey.questions.map((q, qIdx) => (
          <div key={q.id} className="bg-[#0A0A12] p-5 rounded-2xl border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.5)] relative group transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            
            {/* THANH CÔNG CỤ (HEADER CỦA CÂU HỎI) */}
            <div className="flex flex-wrap lg:flex-nowrap justify-between items-center mb-5 gap-4 pb-4 border-b border-white/5">
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold text-black bg-purple-500 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  Module {qIdx + 1}
                </span>
                
                {/* MENU CHỌN LOẠI CÂU HỎI */}
                {q.type !== "text" ? (
                  <select
                    value={q.type || "single_choice"}
                    onChange={(e) => updateQType(qIdx, e.target.value)}
                    className="text-xs font-bold bg-[#05050A] text-purple-300 border border-white/10 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-white/5 transition-colors [&>option]:bg-[#0A0A12] shadow-inner"
                  >
                    <option value="single_choice">🔘 Chọn Đơn (Single)</option>
                    <option value="multi_choice">☑️ Chọn Nhiều (Multi)</option>
                  </select>
                ) : (
                  <span className="text-xs font-mono bg-[#05050A] text-gray-500 border border-white/10 rounded-lg px-3 py-1.5 shadow-inner">
                    📝 Truy vấn Tự luận (Text)
                  </span>
                )}
              </div>

              {/* KHỐI NÚT ĐIỀU KHIỂN: LÊN, XUỐNG, XÓA */}
              <div className="flex bg-[#05050A] rounded-xl border border-white/10 p-1 shadow-inner">
                <button
                  onClick={() => moveQuestionUp(qIdx)}
                  disabled={qIdx === 0}
                  className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-white/10 hover:text-purple-400 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                  title="Dịch chuyển lên"
                >
                  ⬆️
                </button>
                <button
                  onClick={() => moveQuestionDown(qIdx)}
                  disabled={qIdx === survey.questions.length - 1}
                  className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-white/10 hover:text-purple-400 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                  title="Dịch chuyển xuống"
                >
                  ⬇️
                </button>
                <div className="w-px bg-white/10 mx-1"></div>
                <button
                  onClick={() => removeQuestion(qIdx)}
                  className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="Tiêu hủy Module"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* NỘI DUNG CÂU HỎI */}
            <textarea
              className="w-full bg-[#05050A] px-4 py-3 mb-5 rounded-xl border border-white/5 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 font-medium text-gray-200 transition-all resize-none shadow-inner"
              rows={2}
              value={q.text}
              onChange={(e) => updateQText(qIdx, e.target.value)}
              placeholder="Nhập tham số truy vấn..."
            />

            {/* CÁC LỰA CHỌN (OPTIONS) */}
            {q.type !== "text" && q.options && (
              <div className="space-y-3 pl-3 border-l border-white/10 ml-2">
                {q.options.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3 group/opt">
                    <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border transition-colors ${q.type === "multi_choice" ? "rounded-[4px] border-gray-600 group-hover/opt:border-purple-400" : "rounded-full border-gray-600 group-hover/opt:border-purple-400"}`}>
                       <div className="w-2 h-2 rounded-full bg-purple-500 opacity-0 group-hover/opt:opacity-50 transition-opacity"></div>
                    </div>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-transparent hover:bg-white/5 focus:bg-[#05050A] border border-transparent hover:border-white/10 focus:border-purple-500/50 outline-none text-gray-300 transition-all font-mono"
                      value={opt}
                      onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    />
                    <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-600 hover:text-red-400 p-2 font-bold transition-colors opacity-0 group-hover/opt:opacity-100" title="Xóa">✕</button>
                  </div>
                ))}
                
                <button
                  onClick={() => addOption(qIdx)}
                  className="text-[11px] font-bold text-gray-500 hover:text-purple-400 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-wider border border-white/5"
                >
                  <span className="text-lg leading-none">+</span> Thêm tham số phụ
                </button>
              </div>
            )}
            
            {/* KHU VỰC TỰ LUẬN */}
            {q.type === "text" && (
              <div className="pl-5 border-l border-white/10 ml-2">
                <div className="w-full h-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] bg-black/50 border border-dashed border-white/20 rounded-xl text-[11px] text-gray-500 flex items-center justify-center italic cursor-not-allowed font-mono tracking-wider shadow-inner">
                  [ Vùng đệm để người dùng nhập liệu tự do ]
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-5 border border-dashed border-purple-500/40 bg-purple-500/5 text-purple-400 font-extrabold tracking-widest uppercase rounded-2xl hover:bg-purple-500/10 hover:border-purple-400 transition-all flex justify-center items-center gap-3 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
      >
        <span className="text-2xl font-normal drop-shadow-[0_0_5px_#a855f7]">+</span> KHỞI TẠO MODULE TRUY VẤN MỚI
      </button>
    </div>
  );
}