"use client";

import React from "react";

// --- GIỮ NGUYÊN CẤU TRÚC DỮ LIỆU ĐỂ KHÔNG BỊ LỖI ---
export type AnalyzeResult = {
  outline: string[];
  objectives: string[];
  key_concepts: string[];
  common_misconceptions: string[];
  pacing_flags: string[];
  survey_items: { knowledge: string[]; metacognition: string[]; pace: string[] };
  quiz: { multiple_choice: { q: string; choices: string[]; answer: string }[] };

  // KT–KN
  standards?: Array<{
    code: string;
    descriptor: string;
    bloom: "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create";
    competency: string;
    alignment_score: number;
    evidence_items: string[];
    assessment_items: string[];
  }>;
  success_criteria?: string[];
  rubric?: Array<{
    criterion: string;
    levels: { M4: string; M3: string; M2: string; M1: string };
  }>;
  misalignment?: string[];
  recommendations?: string[];
};

export default function ResultsView({
  result,
  lessonTitle = "bai_hoc",
}: {
  result: AnalyzeResult;
  lessonTitle?: string;
}) {

  // Component con để hiển thị từng mục (Giữ nguyên để đảm bảo giao diện cũ)
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <details className="rounded-xl border p-4 bg-white shadow-sm" open>
      <summary className="cursor-pointer select-none text-base font-bold text-gray-800 flex items-center gap-2">
        {title}
      </summary>
      <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-gray-700 leading-relaxed">
        {items?.length ? (
          items.map((x, i) => <li key={i}>{x}</li>)
        ) : (
          <li className="italic text-gray-400">Không có dữ liệu.</li>
        )}
      </ul>
    </details>
  );

  if (!result) return null;

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      
      {/* --- ĐÃ XÓA CÁC NÚT XUẤT FILE Ở ĐÂY --- */}

      {/* --- CÁC PHẦN NỘI DUNG DƯỚI ĐÂY ĐƯỢC GIỮ NGUYÊN 100% --- */}

      <Section title="🎯 Mục tiêu (Objectives)" items={result.objectives} />
      <Section title="🧭 Dàn ý (Outline)" items={result.outline} />
      <Section title="🔑 Trọng tâm (Key concepts)" items={result.key_concepts} />
      
      {/* Lỗi sai thường gặp */}
      {result.common_misconceptions?.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
           <h3 className="text-base font-bold text-orange-800 mb-3 flex items-center gap-2">
             ⚠️ Dễ hiểu nhầm (Misconceptions)
           </h3>
           <ul className="list-none space-y-2">
              {result.common_misconceptions.map((item, idx) => (
                <li key={idx} className="text-sm text-orange-900 bg-white p-2 rounded border border-orange-100 flex gap-2">
                   <span className="text-red-500 font-bold">✕</span> {item}
                </li>
              ))}
           </ul>
        </div>
      )}

      <Section title="⏱️ Cờ tốc độ (Pacing flags)" items={result.pacing_flags} />

      {/* Chuẩn KT-KN (Logic hiển thị phức tạp được giữ nguyên) */}
      {result.standards?.length ? (
        <details className="rounded-xl border p-4 bg-white shadow-sm" open>
          <summary className="cursor-pointer select-none text-base font-bold text-gray-800">
            📐 Chuẩn kiến thức – kỹ năng (mapping)
          </summary>
          <div className="mt-3 space-y-3">
            {result.standards.map((s, i) => (
              <div key={i} className="rounded-lg border p-3 bg-gray-50/50">
                <div className="text-sm font-bold text-indigo-700">
                  {s.code} — {s.descriptor}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Bloom: {s.bloom}</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Độ khớp: {(s.alignment_score * 100).toFixed(0)}%</span>
                </div>
                
                {s.evidence_items?.length ? (
                  <div className="mt-2">
                    <div className="text-xs font-bold text-gray-500 uppercase">Minh chứng:</div>
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {s.evidence_items.map((e, j) => <li key={j}>{e}</li>)}
                    </ul>
                  </div>
                ) : null}
                
                {s.assessment_items?.length ? (
                  <div className="mt-2">
                    <div className="text-xs font-bold text-gray-500 uppercase">Gợi ý đánh giá:</div>
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {s.assessment_items.map((e, j) => <li key={j}>{e}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {result.success_criteria?.length ? (
        <Section title="✅ Tiêu chí thành công" items={result.success_criteria} />
      ) : null}

      {/* Rubric Bảng (Giữ nguyên) */}
      {result.rubric?.length ? (
        <details className="rounded-xl border p-4 bg-white" open>
          <summary className="cursor-pointer select-none text-base font-bold text-gray-800">
            📊 Rubric đánh giá
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[640px] text-sm w-full">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Tiêu chí</th>
                  <th className="px-3 py-2 font-bold w-1/6">M4</th>
                  <th className="px-3 py-2 font-bold w-1/6">M3</th>
                  <th className="px-3 py-2 font-bold w-1/6">M2</th>
                  <th className="px-3 py-2 font-bold w-1/6">M1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.rubric.map((r, i) => (
                  <tr key={i} className="bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.criterion}</td>
                    <td className="px-3 py-2 text-center">{r.levels.M4}</td>
                    <td className="px-3 py-2 text-center">{r.levels.M3}</td>
                    <td className="px-3 py-2 text-center">{r.levels.M2}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{r.levels.M1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {result.misalignment?.length ? (
        <Section title="🚩 Điểm lệch chuẩn" items={result.misalignment} />
      ) : null}

      {result.recommendations?.length ? (
        <Section title="🛠️ Gợi ý điều chỉnh" items={result.recommendations} />
      ) : null}

    </div>
  );
}