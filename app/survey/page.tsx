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
  
  // STATE CHỐNG SPAM CLICK
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/get-survey?id=${surveyId}&t=${Date.now()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSurvey(data.payload || data.survey_v2 || data);
      } catch (err: any) { setError("Không tìm thấy phiếu."); } 
      finally { setLoading(false); }
    };
    fetchSurvey();
  }, [surveyId]);

  // Xử lý chọn nhiều (Checkbox)
  const handleMultiSelect = (qId: string, value: string) => {
    const current = answers[qId] || [];
    if (current.includes(value)) {
      setAnswers({ ...answers, [qId]: current.filter((v: string) => v !== value) });
    } else {
      setAnswers({ ...answers, [qId]: [...current, value] });
    }
  };

  // Xử lý chọn 1 (Radio)
  const handleSingleSelect = (qId: string, value: string) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Chặn nếu đang gửi
    if (!surveyId) return alert("Lỗi ID phiếu");
    
    // ==========================================
    // VALIDATE ĐỘNG (THÔNG MINH HƠN)
    // ==========================================
    // Lọc ra những câu trắc nghiệm mà học sinh chưa trả lời
    const unanswered = survey.questions.filter((q: any) => {
      if (q.type === "single_choice") {
        return !answers[q.id]; // Chưa chọn cái nào
      }
      if (q.type === "multi_choice") {
        return !answers[q.id] || answers[q.id].length === 0; // Chưa tick ô nào
      }
      return false; // Bỏ qua câu Tự luận (Cho phép để trống không ép buộc)
    });

    if (unanswered.length > 0) {
        alert("Vui lòng đánh dấu đầy đủ các câu hỏi trắc nghiệm trước khi gửi phiếu nhé!");
        return;
    }

    setIsSubmitting(true); // Khóa nút

    try {
      const res = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, answers })
      });
      if (!res.ok) throw new Error("Lỗi server");
      setSubmitted(true);
    } catch (err: any) { 
        alert("⚠️ Lỗi: " + err.message); 
        setIsSubmitting(false); // Mở lại nếu lỗi
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 font-bold animate-pulse">Đang tải... ⏳</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  
  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white text-center font-sans">
      <div className="text-7xl mb-4 animate-bounce">✅</div>
      <h2 className="text-2xl font-bold mb-2">Gửi thành công!</h2>
      <p className="opacity-90 text-sm">Cảm ơn em đã đóng góp ý kiến xây dựng lớp học.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-12">
      {/* HEADER */}
      <div className="bg-white pb-8 pt-8 px-6 rounded-b-[2rem] shadow-sm border-b border-indigo-50">
        <div className="max-w-xl mx-auto text-center">
          <div style={{ pointerEvents: 'none', userSelect: 'none' }} className="inline-block mb-2">
             <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
               EduMirror X • Survey
             </span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 leading-tight">{survey.title}</h1>
          <p className="mt-1 text-gray-500 text-xs">Khảo sát ẩn danh 100%</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-4 -mt-4">
        {survey.questions.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              {q.text}
            </h3>

            {/* DẠNG 1: CHỌN 1 (SINGLE CHOICE) */}
            {q.type === "single_choice" && (
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => {
                   const isSelected = answers[q.id] === opt;
                   return (
                    <button key={i} onClick={() => handleSingleSelect(q.id, opt)} 
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-gray-200 hover:bg-gray-50"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-indigo-500" : "border-gray-300 bg-white"}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? "text-indigo-900" : "text-gray-600"}`}>{opt}</span>
                    </button>
                   )
                })}
              </div>
            )}

            {/* DẠNG 2: CHỌN NHIỀU (MULTI CHOICE) */}
            {q.type === "multi_choice" && (
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => {
                  const isChecked = (answers[q.id] || []).includes(opt);
                  return (
                    <div key={i}>
                        <button onClick={() => handleMultiSelect(q.id, opt)} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isChecked ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${isChecked ? "bg-purple-500 border-purple-500" : "border-gray-300 bg-white"}`}>
                            {isChecked && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className={`text-sm font-medium ${isChecked ? "text-purple-900" : "text-gray-600"}`}>{opt}</span>
                        </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DẠNG 3: TEXT */}
            {q.type === "text" && (
              <textarea className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-indigo-500 focus:bg-white outline-none text-sm min-h-[80px]" 
                placeholder="Câu trả lời của em (có thể bỏ trống)..." onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            )}
          </div>
        ))}

        <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold text-base shadow-lg transition-all mt-4 flex items-center justify-center gap-2 ${
                isSubmitting 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl active:scale-95"
            }`}
        >
          {isSubmitting ? "Đang gửi..." : "Gửi phiếu 🚀"}
        </button>
        <div className="h-8"></div>
      </div>
    </div>
  );
}

export default function SurveyPage() { return <Suspense fallback={<div>...</div>}><SurveyForm /></Suspense>; }