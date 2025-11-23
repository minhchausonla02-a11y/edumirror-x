"use client";
import { useState, useEffect, useRef } from "react";

export default function AISuggestionsView({ lessonText, apiKey, model }: any) {
  const [stats, setStats] = useState<any>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lấy dữ liệu thống kê từ Dashboard gửi sang
    const savedStats = localStorage.getItem("current_stats");
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // Tự động phân tích ngay khi có dữ liệu (hoặc bấm nút)
  const handleAnalyze = async () => {
    if (!stats) return;
    setLoading(true);
    try {
      const res = await fetch("/api/get-solution", {
        method: "POST",
        body: JSON.stringify({ stats, lessonText, apiKey }) // Gửi cả Stats và Giáo án
      });
      const data = await res.json();
      setSolution(data.result);
    } catch (e) {
      alert("Lỗi kết nối AI");
    } finally {
      setLoading(false);
    }
  };

  // Gửi chat
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat-with-ai", {
        method: "POST",
        body: JSON.stringify({ 
            question: userMsg,
            context: { diagnosis: JSON.stringify(stats), currentSolution: solution },
            apiKey 
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', content: data.result }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "Lỗi kết nối." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-full text-2xl">🤖</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">Tư vấn Sư phạm AI (EduMirror+)</h2>
                <p className="text-sm text-gray-500">Phân tích chuyên sâu 4 tầng: Số liệu - Nguyên nhân - Đối chiếu - Giải pháp</p>
            </div>
         </div>
         {!solution && stats && (
             <button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
             >
                {loading ? "Đang suy luận..." : "✨ Kích hoạt Phân tích 4 Tầng"}
             </button>
         )}
      </div>

      {/* NỘI DUNG PHÂN TÍCH 4 TẦNG */}
      {solution ? (
        <div className="animate-fade-in-up">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: solution }}></div>
            
            <div className="mt-6 text-center">
                <button onClick={() => { setSolution(null); localStorage.removeItem("current_stats"); }} className="text-xs text-gray-400 underline hover:text-red-500">
                    Xóa phân tích này & Làm lại
                </button>
            </div>
        </div>
      ) : !stats && (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed">
            <p>Chưa có dữ liệu từ Dashboard. Vui lòng quay lại Dashboard và bấm "Nhờ AI tư vấn".</p>
        </div>
      )}

      {/* CHATBOT */}
      {solution && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-[500px]">
              <div className="bg-gray-900 p-4 text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">👨‍🏫</div>
                  <div className="font-bold text-sm">Trợ lý Sư phạm (Hỏi thêm về giải pháp)</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  <div className="flex gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm">🤖</div>
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border border-gray-200 text-gray-700">
                          Em đã phân tích xong. Thầy/cô có muốn hỏi sâu hơn về giải pháp nào không ạ? Ví dụ: "Cho tôi xin slide bài tập mồi".
                      </div>
                  </div>
                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-indigo-100'}`}>{msg.role === 'user' ? 'T' : '🤖'}</div>
                          <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>{msg.content}</div>
                      </div>
                  ))}
                  {chatLoading && <div className="text-xs text-gray-400 italic ml-12">AI đang viết...</div>}
                  <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t bg-white flex gap-2">
                  <input type="text" className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nhập câu hỏi..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} />
                  <button onClick={handleSendChat} disabled={chatLoading} className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700">➤</button>
              </div>
          </div>
      )}
    </div>
  );
}