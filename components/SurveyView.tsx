"use client";

import { SurveyV2, SurveyItem } from "@/data/surveyBank";

// Để chỗ khác trong project vẫn có thể dùng type SurveyV2
export type { SurveyV2 } from "@/data/surveyBank";

function ItemControl({ item }: { item: SurveyItem }) {
  // CÂU CHỌN 1 (single) → radio
  if (item.type === "single") {
    return (
      <div className="space-y-1">
        {item.options.map((opt, idx) => (
          <label
            key={idx}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <input
              type="radio"
              name={item.id}
              className="mt-0.5"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  // CÂU CHỌN NHIỀU (multi) → checkbox
  if (item.type === "multi") {
    return (
      <div className="space-y-1">
        {item.options.map((opt, idx) => (
          <label
            key={idx}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <input
              type="checkbox"
              className="mt-0.5"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  // CÂU TỰ LUẬN NGẮN (text) → textarea
  if (item.type === "text") {
    return (
      <textarea
        className="mt-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
        rows={3}
        maxLength={item.maxLength ?? 300}
        placeholder="Viết ngắn gọn, tối đa 50 từ..."
      />
    );
  }

  return null;
}

export default function SurveyView({ survey }: { survey: SurveyV2 }) {
  return (
    <div className="space-y-4">
      {/* Tiêu đề + hướng dẫn */}
      <h2 className="text-lg font-semibold">{survey.title}</h2>
      {survey.intro && (
        <p className="text-sm text-neutral-600">{survey.intro}</p>
      )}

      {/* Danh sách câu hỏi */}
      <ol className="mt-2 space-y-4 text-sm">
        {survey.items.map((item, index) => (
          <li
            key={item.id}
            className="border-t pt-3 first:border-t-0 first:pt-0"
          >
            <p className="font-medium mb-2">
              {index + 1}. {item.label}
            </p>
            <ItemControl item={item} />
          </li>
        ))}
      </ol>
    </div>
  );
}
