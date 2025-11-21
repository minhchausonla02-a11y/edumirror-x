"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SurveyForm() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id"); 

  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!surveyId) return;
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/get-survey?id=${surveyId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được phiếu");
        setSurvey(data.payload || data.survey_v2 || data);
      } catch (err: any) {
        setError("Không tìm thấy phiếu khảo sát. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [surveyId]);

  const handleMultiSelect = (qId: string, value: string) => {
    const current = answers[qId] || [];
    if (current.includes(value)) {
      setAnswers({ ...answers, [qId]: current.filter((v: string) => v !== value) });
    } else {
      setAnswers({ ...answers, [qId]: [...current, value] });
    }
  };

  const handleSubmit = async () => {
    if (!surveyId) {
      alert("Lỗi: Không tìm thấy ID phiếu.");
      return;
    }
    try {
      const res = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, answers })
      });
      if (!res.ok) throw new Error("Lỗi server");
      setSubmitted(true);
    } catch (err: any) {
      alert("⚠️ Lỗi nộp bài: " + err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 animate-pulse">Đang tải phiếu... ⏳</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white text-center">
      <div className="text-8xl mb-6 animate-bounce">🚀</div>
      <h2 className="text-3xl font-bold mb-2">Đã gửi thành công!</h2>
      <p className="opacity-90">Cảm ơn em đã phản hồi.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans pb-12">
      {/* --- HEADER ĐÃ SỬA: KHÔNG CÓ LINK --- */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 pb-24 pt-12 px-6 rounded-b-[3rem] shadow-xl mb-[-4rem]">
        <div className="max-w-xl mx-auto text-center text-white">
          {/* Dùng thẻ span và pointer-events-none để CHẶN CLICK tuyệt đối */}
          <div className="inline-block mb-3">
             <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/30 shadow-sm cursor-default pointer-events-none select-none">
                EduMirror X • 60s Feedback
             </span>
          </div>
          <h1 className="text-2xl font-bold leading-snug">{survey.title}</h1>
          <p className="mt-2 text-indigo-100 text-xs opacity-90">100% Ẩn danh • Hãy chia sẻ thật lòng nhé!</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-5">
        {survey.questions.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex gap-3 items-start">
              <span className="bg-indigo-100 text-indigo-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
              {q.text}
            </h3>

            {q.type === "sentiment" && (
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt: string) => {
                  const [emoji, desc] = opt.split("|");
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1 ${
                        isSelected ? "border-indigo-500 bg-indigo-50 scale-[1.02]" : "border-transparent bg-gray-50"
                      }`}
                    >
                      <span className="text-3xl mb-1">{emoji?.split(" ")[0]}</span>
                      <span className="font-bold text-gray-800 text-xs">{emoji?.split(" ")[1] || emoji}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{desc}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "rating" && (
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => (
                    <button key={i} onClick={() => setAnswers({ ...answers, [q.id]: opt })} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${answers[q.id] === opt ? "border-indigo-500 bg-indigo-50" : "border-transparent bg-gray-50"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[q.id] === opt ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-white"}`}>{answers[q.id] === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}</div>
                      <span className={`text-sm font-medium ${answers[q.id] === opt ? "text-indigo-900" : "text-gray-600"}`}>{opt}</span>
                    </button>
                ))}
              </div>
            )}

            {(q.type.includes("checkbox")) && (
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => {
                  const isChecked = (answers[q.id] || []).includes(opt);
                  return (
                    <button key={i} onClick={() => handleMultiSelect(q.id, opt)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${isChecked ? "border-purple-500 bg-purple-50" : "border-gray-100 bg-white"}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${isChecked ? "bg-purple-500 border-purple-500" : "border-gray-300 bg-white"}`}>{isChecked && <span className="text-white text-xs">✓</span>}</div>
                      <span className={`text-sm font-medium ${isChecked ? "text-purple-900" : "text-gray-600"}`}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "text" && (
              <textarea className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-sm" rows={3} placeholder={q.placeholder} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            )}
          </div>
        ))}

        <button onClick={handleSubmit} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-all mt-6">
          Gửi phản hồi ngay 🚀
        </button>
        <div className="text-center pb-8 pt-2"><p className="text-[10px] text-gray-400">Powered by EduMirror X</p></div>
      </div>
    </div>
  );
}

export default function SurveyPage() { return <Suspense fallback={<div>...</div>}><SurveyForm /></Suspense>; }