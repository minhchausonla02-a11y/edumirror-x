"use client";
import { useApp } from "@/lib/store";
import { useEffect, useState } from "react";
import type { AggregateSummary } from "@/lib/types";

export default function AIAdjustPanel() {
  const { state } = useApp();
  const [agg, setAgg] = useState<AggregateSummary | null>(null);

  useEffect(()=>{ fetch("/api/feedback").then(r=>r.json()).then(setAgg); },[]);

  const tips: string[] = [];
  if (agg?.tooFast && (agg.tooFast/(agg.total||1))>=0.2) tips.push("Giảm tốc độ giảng 10–15% ở phần quan trọng.");
  if ((agg?.needExamples||0)>0) tips.push("Bổ sung ví dụ gần thực tế (bài toán địa phương).");
  if ((agg?.notClear||0)>0) tips.push("Ôn lại khái niệm bằng sơ đồ → luyện 2–3 bài nhỏ.");
  if (!tips.length) tips.push("Tiết dạy phù hợp — tiếp tục duy trì nhịp độ hiện tại.");

  return (
    <section id="ai" className="card p-5 mt-6">
      <div className="section-title">💡 Gợi ý điều chỉnh của AI</div>
      {!state.analysis && <div className="subtle">Chưa có phân tích bài học.</div>}
      {state.analysis && (
        <>
          <div className="font-semibold mb-2">{state.analysis.title}</div>
          <ul className="subtle mb-2">
            {state.analysis.suggestions.map((s,i)=><li key={i}>• {s}</li>)}
          </ul>
          <div className="font-medium mt-3 mb-1">Gợi ý từ dữ liệu phản hồi:</div>
          <ul className="subtle">{tips.map((t,i)=><li key={i}>• {t}</li>)}</ul>
        </>
      )}
    </section>
  );
}
