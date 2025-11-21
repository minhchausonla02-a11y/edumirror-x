// app/survey/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SurveyForm() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id"); // Lấy ID từ URL QR Code

  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  // State lưu câu trả lời
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    // MÔ PHỎNG: Lấy dữ liệu phiếu (Thực tế bạn sẽ gọi API /api/get-survey?id=...)
    // Ở đây mình lấy tạm từ LocalStorage để bạn test luồng Demo
    const savedSurvey = localStorage.getItem("mock_survey_data"); 
    if (savedSurvey) {
      setSurvey(JSON.parse(savedSurvey));
    }
    setLoading(false);
  }, [surveyId]);

  const handleOptionChange = (qId: string, value: any, type: string) => {
    if (type === "checkbox_dynamic") {
      const current = answers[qId] || [];
      if (current.includes(value)) {
        setAnswers({ ...answers, [qId]: current.filter((v: string) => v !== value) });
      } else {
        setAnswers({ ...answers, [qId]: [...current, value] });
      }
    } else {
      setAnswers({ ...answers, [qId]: value });
    }
  };

  const handleSubmit = () => {
    console.log("Dữ liệu gửi về:", answers);
    setSubmitted(true);
    // TODO: Gọi API /api/submit-survey để lưu kết quả
  };

  if (loading) return <div className="p-10 text-center">Đang tải phiếu...</div>;
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">Cảm ơn em!</h2>
        <p className="text-gray-600">Ý kiến của em đã được gửi ẩn danh đến thầy/cô.</p>
      </div>
    </div>
  );

  if (!survey) return <div className="p-10 text-center">Không tìm thấy phiếu khảo sát.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <h1 className="text-xl font-bold">{survey.title}</h1>
          <p className="text-indigo-100 text-sm mt-1 opacity-90">Phiếu phản hồi ẩn danh • 60 giây</p>
        </div>

        <div className="p-6 space-y-8">
          {survey.questions.map((q: any, idx: number) => (
            <div key={q.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
              <h3 className="font-bold text-gray-800 mb-3 flex gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-full text-xs flex-shrink-0 mt-0.5">{idx + 1}</span>
                {q.text}
              </h3>

              {/* 1. CẢM XÚC */}
              {q.type === "sentiment" && (
                <div className="grid grid-cols-4 gap-2">
                  {q.options.map((opt: string) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleOptionChange(q.id, opt, "sentiment")}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          isSelected ? "border-indigo-600 bg-indigo-50 scale-105" : "border-transparent bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-3xl">{opt.split(" ")[1]}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? "text-indigo-700" : "text-gray-500"}`}>{opt.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. RATING */}
              {q.type === "rating" && (
                <div className="space-y-2">
                  {q.options.map((opt: string) => (
                    <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      answers[q.id] === opt ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-gray-200 hover:border-indigo-300"
                    }`}>
                      <input 
                        type="radio" 
                        name={q.id} 
                        className="w-5 h-5 text-indigo-600"
                        onChange={() => handleOptionChange(q.id, opt, "rating")}
                        checked={answers[q.id] === opt}
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 3. CHECKBOX DYNAMIC (AI) */}
              {q.type === "checkbox_dynamic" && (
                <div className="space-y-2">
                  {q.options.map((opt: string) => {
                    const isChecked = (answers[q.id] || []).includes(opt);
                    return (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        isChecked ? "border-orange-500 bg-orange-50" : "border-gray-200"
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 text-orange-500 rounded"
                          onChange={() => handleOptionChange(q.id, opt, "checkbox_dynamic")}
                          checked={isChecked}
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

               {/* 4. QUIZ (AI) */}
               {q.type === "quiz" && (
                <div className="grid grid-cols-1 gap-2">
                  {q.quiz_data?.options.map((opt: string, i: number) => {
                     const isSelected = answers[q.id] === opt;
                     return (
                      <button
                        key={opt}
                        onClick={() => handleOptionChange(q.id, opt, "quiz")}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          isSelected ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-bold mr-2">{["A", "B", "C", "D"][i]}.</span> {opt}
                      </button>
                     )
                  })}
                </div>
              )}

              {/* 5. TEXT */}
              {q.type === "text" && (
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  rows={3}
                  placeholder={q.placeholder}
                  onChange={(e) => handleOptionChange(q.id, e.target.value, "text")}
                />
              )}
            </div>
          ))}

          <button 
            onClick={handleSubmit}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Gửi phản hồi 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurveyForm />
    </Suspense>
  );
}