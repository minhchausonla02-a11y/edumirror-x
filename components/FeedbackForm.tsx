"use client";
import { useApp } from "@/lib/store";
import { useMemo, useState } from "react";
import type { SurveyQuestion } from "@/lib/types";
import { motion } from "framer-motion";

export default function FeedbackForm() {
  const { state } = useApp();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sent, setSent] = useState(false);

  const survey: SurveyQuestion[] = state.survey;

  const onSend = async () => {
    const payload = { lessonId: state.analysis?.title || "lesson", answers, at: Date.now() };
    await fetch("/api/feedback", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    setSent(true);
    setTimeout(()=>setSent(false), 1500);
    setAnswers({});
  };

  const update = (id:string, v:any) => setAnswers(prev => ({ ...prev, [id]: v }));

  return (
    <section id="survey" className="card p-5 mt-6">
      <div className="section-title">👩‍🎓 Khảo sát ẩn danh</div>
      {!survey?.length && <div className="subtle">Chưa có câu hỏi. Hãy “Phân tích giáo án” → “Sinh bộ câu hỏi”.</div>}
      {survey?.length>0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid gap-3">
          {survey.map(q => (
            <div key={q.id} className="card p-4">
              <div className="font-medium mb-2">{q.text}</div>
              {q.type==="scale" && (
                <div className="flex gap-2">
                  {q.options!.map(o=>(
                    <button key={o}
                      className={"btn "+(answers[q.id]==o?"btn-primary":"")}
                      onClick={()=>update(q.id, o)}>{o}</button>
                  ))}
                </div>
              )}
              {q.type==="single" && (
                <div className="flex gap-2 flex-wrap">
                  {q.options!.map(o=>(
                    <button key={o}
                      className={"btn "+(answers[q.id]==o?"btn-primary":"")}
                      onClick={()=>update(q.id, o)}>{o}</button>
                  ))}
                </div>
              )}
              {q.type==="multi" && (
                <div className="flex gap-2 flex-wrap">
                  {q.options!.map(o=>{
                    const arr = Array.isArray(answers[q.id]) ? answers[q.id] as string[] : [];
                    const on = arr.includes(o);
                    return (
                      <button key={o}
                        className={"btn "+(on?"btn-primary":"")}
                        onClick={()=>{
                          const next = on ? arr.filter(x=>x!==o) : [...arr,o];
                          update(q.id, next);
                        }}>{o}</button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-8">
            <button className="btn btn-primary" onClick={onSend} disabled={!Object.keys(answers).length}>
              Gửi phản hồi ẩn danh
            </button>
            {sent && <span className="badge">Đã gửi ✓</span>}
          </div>
        </motion.div>
      )}
    </section>
  );
}
