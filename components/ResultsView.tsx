"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export type AnalyzeResult = {
  outline: string[];
  objectives: string[];
  key_concepts: string[];
  common_misconceptions: string[];
  pacing_flags: string[];
  survey_items: { knowledge: string[]; metacognition: string[]; pace: string[] };
  quiz: { multiple_choice: { q: string; choices: string[]; answer: string }[] };

  // KT–KN (tùy chọn)
  standards?: Array<{
    code: string;
    descriptor: string;
    bloom:
      | "Remember"
      | "Understand"
      | "Apply"
      | "Analyze"
      | "Evaluate"
      | "Create";
    competency: string;
    alignment_score: number; // 0–1
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

/* ---------- Helpers: download text (CSV/JSON) ---------- */
function download(name: string, data: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

/* ---------- Helpers: export XLSX (UTF-8) ---------- */
/** Tạo workbook .xlsx từ mảng mảng (AOA) và lưu file */
function exportAOAtoXLSX(filename: string, sheetName: string, aoa: any[][]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // (Tuỳ chọn) set độ rộng cột cơ bản
  const maxCols = Math.max(...aoa.map((r) => r.length));
  ws["!cols"] = Array.from({ length: maxCols }, () => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename, { compression: true });
  // Ghi chú: font mặc định (Times New Roman) không thể áp ở bản community.
}

/* ====================================================== */

export default function ResultsView({
  result,
  lessonTitle = "bai_hoc",
}: {
  result: AnalyzeResult;
  lessonTitle?: string;
}) {
  const [openJSON, setOpenJSON] = useState(false);

  /* ---------- CSV Exports ---------- */
  const exportSurveyCSV = () => {
    const rows: (string | number)[][] = [["section", "question"]];
    for (const q of result.survey_items.knowledge) rows.push(["knowledge", q]);
    for (const q of result.survey_items.metacognition)
      rows.push(["metacognition", q]);
    for (const q of result.survey_items.pace) rows.push(["pace", q]);
    download(`survey_${lessonTitle}.csv`, toCSV(rows), "text/csv;charset=utf-8");
  };

  const exportQuizCSV = () => {
    const rows: (string | number)[][] = [["q", "A", "B", "C", "D", "answer"]];
    for (const it of result.quiz.multiple_choice) {
      const [A, B, C, D] = it.choices as string[];
      rows.push([it.q, A ?? "", B ?? "", C ?? "", D ?? "", it.answer]);
    }
    download(`quiz_${lessonTitle}.csv`, toCSV(rows), "text/csv;charset=utf-8");
  };

  const exportStandardsCSV = () => {
    if (!result.standards?.length) return;
    const rows: (string | number)[][] = [
      [
        "code",
        "descriptor",
        "bloom",
        "competency",
        "alignment_score",
        "evidence_items",
        "assessment_items",
      ],
    ];
    for (const s of result.standards) {
      rows.push([
        s.code,
        s.descriptor,
        s.bloom,
        s.competency,
        s.alignment_score,
        (s.evidence_items || []).join(" | "),
        (s.assessment_items || []).join(" | "),
      ]);
    }
    download(
      `standards_${lessonTitle}.csv`,
      toCSV(rows),
      "text/csv;charset=utf-8"
    );
  };

  /* ---------- XLSX Exports (UTF-8) ---------- */
  const exportSurveyXLSX = () => {
    const aoa: any[][] = [["section", "question"]];
    for (const q of result.survey_items.knowledge) aoa.push(["knowledge", q]);
    for (const q of result.survey_items.metacognition)
      aoa.push(["metacognition", q]);
    for (const q of result.survey_items.pace) aoa.push(["pace", q]);
    exportAOAtoXLSX(`survey_${lessonTitle}.xlsx`, "Survey", aoa);
  };

  const exportQuizXLSX = () => {
    const aoa: any[][] = [["q", "A", "B", "C", "D", "answer"]];
    for (const it of result.quiz.multiple_choice) {
      const [A, B, C, D] = it.choices as string[];
      aoa.push([it.q, A ?? "", B ?? "", C ?? "", D ?? "", it.answer]);
    }
    exportAOAtoXLSX(`quiz_${lessonTitle}.xlsx`, "Quiz", aoa);
  };

  const exportStandardsXLSX = () => {
    if (!result.standards?.length) return;
    const aoa: any[][] = [
      [
        "code",
        "descriptor",
        "bloom",
        "competency",
        "alignment_score",
        "evidence_items",
        "assessment_items",
      ],
    ];
    for (const s of result.standards) {
      aoa.push([
        s.code,
        s.descriptor,
        s.bloom,
        s.competency,
        s.alignment_score,
        (s.evidence_items || []).join(" | "),
        (s.assessment_items || []).join(" | "),
      ]);
    }
    exportAOAtoXLSX(`standards_${lessonTitle}.xlsx`, "Standards", aoa);
  };

  /* ---------- UI helpers ---------- */
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <details className="rounded-xl border p-4 bg-white" open>
      <summary className="cursor-pointer select-none text-base font-semibold">
        {title}
      </summary>
      <ul className="mt-2 list-disc pl-6 space-y-1 text-sm">
        {items?.length ? (
          items.map((x, i) => <li key={i}>{x}</li>)
        ) : (
          <li className="italic text-neutral-500">Không có dữ liệu.</li>
        )}
      </ul>
    </details>
  );

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {/* CSV */}
        <button
          onClick={exportSurveyCSV}
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          ⬇️ Xuất CSV Khảo sát
        </button>
        <button
          onClick={exportQuizCSV}
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          ⬇️ Xuất CSV Câu hỏi trắc nghiệm
        </button>
        {result.standards?.length ? (
          <button
            onClick={exportStandardsCSV}
            className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
          >
            ⬇️ Xuất CSV Chuẩn KT–KN
          </button>
        ) : null}

        {/* XLSX */}
        <button
          onClick={exportSurveyXLSX}
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          ⬇️ Xuất Excel (UTF-8) Khảo sát
        </button>
        <button
          onClick={exportQuizXLSX}
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          ⬇️ Xuất Excel (UTF-8) Trắc nghiệm
        </button>
        {result.standards?.length ? (
          <button
            onClick={exportStandardsXLSX}
            className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
          >
            ⬇️ Xuất Excel (UTF-8) Chuẩn KT–KN
          </button>
        ) : null}

        {/* JSON */}
        <button
          onClick={() => setOpenJSON((s) => !s)}
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          {openJSON ? "Ẩn JSON" : "Hiện JSON"}
        </button>
        <button
          onClick={() =>
            navigator.clipboard.writeText(JSON.stringify(result, null, 2))
          }
          className="px-3 py-2 rounded border bg-white hover:bg-neutral-50"
        >
          Copy JSON
        </button>
      </div>

      {/* Sections */}
      <Section title="🎯 Mục tiêu (Objectives)" items={result.objectives} />
      <Section title="🧭 Dàn ý (Outline)" items={result.outline} />
      <Section title="🔑 Trọng tâm (Key concepts)" items={result.key_concepts} />
      <Section
        title="⚠️ Dễ hiểu nhầm (Misconceptions)"
        items={result.common_misconceptions}
      />
      <Section title="⏱️ Cờ tốc độ (Pacing flags)" items={result.pacing_flags} />

      {/* KT–KN */}
      {result.standards?.length ? (
        <details className="rounded-xl border p-4 bg-white" open>
          <summary className="cursor-pointer select-none text-base font-semibold">
            📐 Chuẩn kiến thức – kỹ năng (mapping)
          </summary>
          <div className="mt-3 space-y-3">
            {result.standards.map((s, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-semibold">
                  {s.code} — {s.descriptor}
                </div>
                <div className="text-xs text-neutral-600 mt-1">
                  Bloom: {s.bloom} • Năng lực: {s.competency} • Độ khớp:{" "}
                  {(s.alignment_score * 100).toFixed(0)}%
                </div>
                {s.evidence_items?.length ? (
                  <div className="mt-2">
                    <div className="text-sm font-medium">
                      Bằng chứng trong giáo án
                    </div>
                    <ul className="list-disc pl-5 text-sm">
                      {s.evidence_items.map((e, j) => (
                        <li key={j}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {s.assessment_items?.length ? (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Gợi ý đánh giá</div>
                    <ul className="list-disc pl-5 text-sm">
                      {s.assessment_items.map((e, j) => (
                        <li key={j}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {result.success_criteria?.length ? (
        <Section
          title="✅ Tiêu chí thành công (student-friendly)"
          items={result.success_criteria}
        />
      ) : null}

      {result.rubric?.length ? (
        <details className="rounded-xl border p-4 bg-white" open>
          <summary className="cursor-pointer select-none text-base font-semibold">
            📊 Rubric 4 mức
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[640px] text-sm border">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border px-2 py-1 text-left">Tiêu chí</th>
                  <th className="border px-2 py-1">M4</th>
                  <th className="border px-2 py-1">M3</th>
                  <th className="border px-2 py-1">M2</th>
                  <th className="border px-2 py-1">M1</th>
                </tr>
              </thead>
              <tbody>
                {result.rubric.map((r, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{r.criterion}</td>
                    <td className="border px-2 py-1">{r.levels.M4}</td>
                    <td className="border px-2 py-1">{r.levels.M3}</td>
                    <td className="border px-2 py-1">{r.levels.M2}</td>
                    <td className="border px-2 py-1">{r.levels.M1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {result.misalignment?.length ? (
        <Section
          title="🚩 Điểm lệch chuẩn / thiếu minh chứng"
          items={result.misalignment}
        />
      ) : null}

      {result.recommendations?.length ? (
        <Section
          title="🛠️ Gợi ý điều chỉnh tiết dạy"
          items={result.recommendations}
        />
      ) : null}

      {openJSON && (
        <pre className="bg-neutral-50 p-4 rounded-xl text-xs overflow-auto border">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
