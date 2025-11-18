"use client";

import { useState, type FormEvent, useEffect } from "react";
import { SurveyV2, SurveyItem } from "@/data/surveyBank";

// Cho chỗ khác trong project vẫn có thể dùng type SurveyV2
export type { SurveyV2 } from "@/data/surveyBank";

function ItemControl({ item }: { item: SurveyItem }) {
  const name = item.id;

  // CÂU CHỌN 1 (single) → radio
  if (item.type === "single") {
    return (
      <div className="space-y-1">
        {item.options?.map((opt, idx) => (
          <label
            key={idx}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <input
              type="radio"
              name={name}
              value={opt}
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
        {item.options?.map((opt, idx) => (
          <label
            key={idx}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <input
              type="checkbox"
              name={name}
              value={opt}
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
        name={name}
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
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortId, setShortId] = useState<string | null>(
    survey.shortId ?? null
  );

  // Lấy shortId từ URL ?id=... (nếu có)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("id");
    if (fromUrl) {
      setShortId(fromUrl);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const answers: Record<string, any> = {};

      // Gom câu trả lời theo item.id
      survey.items.forEach((item) => {
        const key = item.id;
        const values = formData.getAll(key); // FormDataEntryValue[]

        if (values.length === 0) {
          answers[key] = null;
        } else if (values.length === 1) {
          answers[key] = values[0];
        } else {
          answers[key] = values;
        }
      });

      // Có thể thêm label lớp ở đây nếu sau này bạn muốn cho GV nhập lớp
      const classLabel: string | null = null;

      const res = await fetch("/api/submit-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortId: shortId ?? survey.shortId ?? null,
          classLabel,
          answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gửi dữ liệu thất bại.");
      }

      setSubmitted(true);
      e.currentTarget.reset();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra, em thử lại sau nhé.");
    } finally {
      setLoading(false);
    }
  }

  // Màn hình cảm ơn sau khi gửi
  if (submitted) {
    return (
      <div className="space-y-3 p-6 rounded-xl bg-white shadow">
        <h2 className="text-lg font-semibold">Cảm ơn em 💙</h2>
        <p className="text-sm text-neutral-600">
          Phiếu 60 giây của em đã được ghi nhận (ẩn danh). Chúc em học tốt!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Thông báo lỗi nếu có */}
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Nút gửi phiếu */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? "Đang gửi..." : "Gửi phiếu 60 giây"}
      </button>
    </form>
  );
}
