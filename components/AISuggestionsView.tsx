"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import CSS toán học

export default function AISuggestionsView({ lessonText, apiKey, model }: any) {
  
  // Hàm xử lý LaTeX: Biến \[...\] thành $$...$$ và \(...\) thành $...$
  const preprocessLaTeX = (content: string) => {
    if (!content) return "";
    const blockRep = content.replace(/\\\[(.*?)\\\]/gs, '$$$1$$');
    const inlineRep = blockRep.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
    return inlineRep;
  };

  const [stats, setStats] = useState<any>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedStats = localStorage.getItem("current_stats");
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [chatHistory]);

  const handleAnalyze = async () => {
    if (!stats) return;
    setLoading(true);
    try {
      const res = await fetch("/api/get-solution", {
        method: "POST",
        body: JSON.stringify({ stats, lessonText, apiKey, model }) 
      });
      const data = await res.json();
      setSolution(data.result);
    } catch (e) {
      alert("Lỗi kết nối AI");
    } finally {
      setLoading(false);
    }
  };

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
            apiKey,
            model 
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', content: data.result }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Lỗi kết nối." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      
      {/* --- PHẦN 1: PHÂN TÍCH & GIẢI PHÁP --- */}
      <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-full text-2xl">🤖</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">Tư vấn Sư phạm AI</h2>
                <p className="text-sm text-gray-500">
                    Mode: <span className="font-bold text-indigo-600">{model}</span> • Phân tích chuyên sâu 4 tầng
                </p>
            </div>
         </div>
         {!solution && stats && (
             <button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
             >
                {loading ? "Đang suy luận..." : "✨ Kích hoạt Phân tích"}
             </button>
         )}
      </div>

      {/* HIỂN THỊ NỘI DUNG GIẢI PHÁP (Cũng hỗ trợ Math) */}
      {solution ? (
        <div className="animate-fade-in-up">
            <div className="prose prose-sm max-w-none text-gray-800 bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                {/* Dùng ReactMarkdown cho cả phần giải pháp nếu AI trả về markdown */}
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{ p: ({node, ...props}) => <p className="mb-3" {...props} /> }}
                >
                    {preprocessLaTeX(solution)} 
                </ReactMarkdown>
                {/* Fallback nếu solution là HTML thuần: dangerouslySetInnerHTML (nhưng nên ưu tiên Markdown) */}
            </div>
            
            <div className="mt-6 text-center border-t pt-4">
                <button onClick={() => { setSolution(null); localStorage.removeItem("current_stats"); }} className="text-xs text-gray-400 underline hover:text-red-500">
                    Xóa phân tích này & Làm lại
                </button>
            </div>
        </div>
      ) : !stats && (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed">
            <p className="text-lg">Chưa có dữ liệu từ Dashboard.</p>
            <p className="text-xs mt-1">Vui lòng quay lại tab Dashboard và bấm nút "Nhờ AI tư vấn".</p>
        </div>
      )}

      {/* --- PHẦN 2: KHUNG CHAT (FULL MATH SUPPORT) --- */}
      {solution && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-[500px]">
              <div className="bg-gray-900 p-4 text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">👨‍🏫</div>
                  <div>
                      <div className="font-bold text-sm">Trợ lý Sư phạm (Chat)</div>
                      <div className="text-[10px] text-gray-400">Đang sử dụng: {model}</div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  <div className="flex gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border border-gray-200 text-gray-700 max-w-[85%]">
                          Em đã phân tích xong. Thầy/cô có muốn hỏi sâu hơn về giải pháp nào không ạ?
                      </div>
                  </div>

                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-indigo-100'}`}>
                              {msg.role === 'user' ? 'T' : '🤖'}
                          </div>
                          
                          {/* --- KHU VỰC HIỂN THỊ TIN NHẮN CÓ CÔNG THỨC TOÁN --- */}
                          <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[85%] overflow-x-auto ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />
                                    }}
                                >
                                    {preprocessLaTeX(msg.content)}
                                </ReactMarkdown>
                          </div>
                      </div>
                  ))}
                  
                  {chatLoading && (
                      <div className="text-xs text-gray-400 italic ml-12 animate-pulse">AI đang viết...</div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t bg-white flex gap-2">
                  <input 
                      type="text" 
                      className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="Nhập câu hỏi..." 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} 
                  />
                  <button 
                      onClick={handleSendChat} 
                      disabled={chatLoading || !chatInput.trim()} 
                      className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all"
                  >
                      ➤
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}