"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function AISuggestionsView({ lessonText, apiKey, model }: any) {
  
  // 🚀 BỘ LỌC ĐẶC BIỆT: Khử màu Dark Mode của AI & Xử lý Toán học cho LIGHT THEME
  const processAIHtml = (content: string) => {
    if (!content) return "";
    
    // 1. Render Toán học
    let processed = content.replace(/\\\[(.*?)\\\]/gs, '$$$1$$').replace(/\\\((.*?)\\\)/gs, '$$$1$$');
    
    // 2. Ép các class AI về chuẩn Light Mode
    processed = processed.replace(/bg-transparent/g, "bg-white")
                         .replace(/bg-white\/5/g, "bg-slate-50")
                         .replace(/text-gray-[1-4]00/g, "text-slate-800")
                         .replace(/border-white\/10/g, "border-slate-200")
                         .replace(/text-blue-[3-4]00/g, "text-blue-700")
                         .replace(/bg-blue-500\/10/g, "bg-blue-50")
                         .replace(/text-white/g, "text-slate-800");
    return processed;
  };
  
  const [stats, setStats] = useState<any>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🚀 BƯỚC 1: HIỆU ỨNG LOADING CHỮ CHẠY
  const loadingMessages = [
    "Khởi tạo lõi AI phân tích đa tầng...",
    "Đang bóc tách số liệu thống kê lớp học...",
    "Đang nội suy tâm lý và điểm nghẽn của học sinh...",
    "Đang đối chiếu dữ liệu thực tế với giáo án gốc...",
    "Đang kiến tạo các giải pháp sư phạm chuyên biệt...",
    "Đang đóng gói Báo cáo 4 Tầng. Quá trình này đòi hỏi sự tỉ mỉ..."
  ];
  
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) { 
      interval = setInterval(() => {
        setLoadingIndex((prev) => (prev + 1 < loadingMessages.length ? prev + 1 : prev));
      }, 15000); // 15 giây đổi câu 1 lần
    } else {
      setLoadingIndex(0); 
    }
    return () => clearInterval(interval);
  }, [loading]);

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
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Mất kết nối tới trung tâm phân tích. Vui lòng thử lại." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12 max-w-6xl mx-auto">
      
      {/* --- PHẦN 1: HEADER TRẠM ĐIỀU KHIỂN --- */}
      <div className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10"></div>
         
         <div className="flex items-center gap-5 z-10">
            <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
               🤖
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-blue-800 uppercase tracking-widest">
                    CỐ VẤN SƯ PHẠM AI
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-1 rounded">Engine: <span className="font-bold text-blue-600">{model}</span></span>
                    <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Kích hoạt phân tích 4 tầng</span>
                </div>
            </div>
         </div>
         
         {/* Nút bấm hoặc Hiệu ứng Loading */}
         {!solution && stats && (
             loading ? (
                // 🚀 BƯỚC 2: GIAO DIỆN LOADING HIỆU ỨNG SƯ PHẠM (SÁNG)
                <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-white rounded-xl border border-blue-100 shadow-sm w-full md:w-[400px]">
                    <div className="relative flex items-center justify-center h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-600 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-l-2 border-r-2 border-indigo-400 animate-[spin_2s_linear_reverse]"></div>
                        <div className="text-blue-600 text-[10px] font-bold">AI</div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-blue-700 font-medium animate-pulse text-sm transition-all duration-500 min-h-[40px] flex items-center justify-center">
                            {loadingMessages[loadingIndex]}
                        </p>
                    </div>
                </div>
             ) : (
                // Nút bấm bình thường khi chưa phân tích
                <button 
                    onClick={handleAnalyze} 
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold tracking-widest uppercase shadow-md transition-all z-10 hover:-translate-y-1"
                >
                    ✨ KÍCH HOẠT QUY TRÌNH
                </button>
             )
         )}
      </div>

      {/* HIỂN THỊ NỘI DUNG GIẢI PHÁP */}
      {solution ? (
        <div className="animate-fade-in-up bg-white p-8 md:p-10 rounded-[2.5rem] border border-blue-100 shadow-xl relative">
            
            {/* Vùng hiển thị Markdown tùy chỉnh CSS cho Light Mode */}
            <div className="prose max-w-none 
                prose-headings:text-blue-800 prose-headings:uppercase prose-headings:tracking-wider prose-headings:font-bold
                prose-h3:text-lg prose-h3:border-b prose-h3:border-slate-200 prose-h3:pb-2 prose-h3:text-blue-600
                prose-p:text-slate-700 prose-p:leading-relaxed
                prose-strong:text-blue-700 prose-strong:font-extrabold
                prose-ul:text-slate-600 prose-li:marker:text-blue-500
                prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                [&_ol]:space-y-2 [&_ul]:space-y-2
                katex-display:text-center katex-display:my-4 katex-display:text-xl katex-display:text-emerald-700
                [&_.katex]:text-emerald-700 font-mono text-sm
                [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&>div]:!text-slate-800"
                dangerouslySetInnerHTML={{ __html: processAIHtml(solution) }}
            ></div>
            
            <div className="mt-10 text-right border-t border-slate-200 pt-6">
                <button onClick={() => { setSolution(null); localStorage.removeItem("current_stats"); }} className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:text-red-500 transition-colors border border-transparent hover:border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg">
                    [ ⚠️ RESET TOÀN BỘ PHÂN TÍCH ]
                </button>
            </div>
        </div>
      ) : !stats && (
        <div className="text-center py-28 bg-white rounded-[3rem] border border-blue-100 shadow-sm">
            <div className="text-5xl opacity-30 mb-6">🔌</div>
            <p className="text-lg font-bold text-slate-500 tracking-widest uppercase">Mất kết nối Dữ liệu</p>
            <p className="text-xs text-slate-400 mt-2 font-mono">Vui lòng quay lại Trạm Báo Cáo và ấn nút "YÊU CẦU GIẢI PHÁP SƯ PHẠM".</p>
        </div>
      )}

      {/* --- PHẦN 2: KHUNG CHAT SƯ PHẠM --- */}
      {solution && (
          <div className="mt-8 bg-slate-50 rounded-[2rem] border border-blue-100 shadow-lg overflow-hidden flex flex-col h-[600px] relative">
              {/* Header Chat */}
              <div className="bg-white p-4 flex items-center justify-between border-b border-blue-100 shadow-sm z-10">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center shadow-sm">👨‍🏫</div>
                      <div>
                          <div className="font-bold text-xs text-slate-700 uppercase tracking-widest">Kênh Liên Lạc Trực Tiếp</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {model}</div>
                      </div>
                  </div>
                  <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                  </div>
              </div>

              {/* Nội dung Chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-transparent relative custom-scrollbar z-0">
                  {/* Lời chào AI */}
                  <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white border border-blue-100 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm">🤖</div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-blue-100 shadow-sm text-sm text-slate-700 max-w-[85%] font-mono leading-relaxed">
                          Quá trình giải mã hoàn tất. Thầy/cô cần trích xuất thêm dữ liệu hoặc chi tiết hóa phương pháp nào không? (Gợi ý: "Lập bảng tóm tắt lỗi sai").
                      </div>
                  </div>

                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-sm border 
                              ${msg.role === 'user' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-blue-100 text-slate-700'}`}>
                              {msg.role === 'user' ? 'T' : '🤖'}
                          </div>
                          
                          <div className={`p-4 rounded-2xl shadow-sm text-sm max-w-[85%] overflow-x-auto leading-relaxed font-mono
                              ${msg.role === 'user' ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-tr-sm' : 'bg-white border border-blue-100 text-slate-700 rounded-tl-sm'}`}>
                                <div className="prose max-w-none prose-p:my-1 prose-pre:bg-slate-100 prose-pre:border prose-pre:border-slate-200 prose-code:text-emerald-700 katex-display:text-emerald-700 [&_.katex]:text-emerald-700 prose-strong:text-blue-700 prose-headings:text-blue-800">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {processAIHtml(msg.content)}
                                    </ReactMarkdown>
                                </div>
                          </div>
                      </div>
                  ))}

                  {chatLoading && (
                      <div className="flex gap-4 animate-fade-in">
                          <div className="w-10 h-10 bg-white border border-blue-100 rounded-full flex items-center justify-center text-lg shadow-sm">🤖</div>
                          <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-blue-100 shadow-sm">
                              <div className="flex gap-1.5">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Chat */}
              <div className="p-4 bg-white border-t border-blue-100 flex gap-3 z-10">
                  <input 
                      type="text" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono placeholder:text-slate-400 transition-all shadow-inner" 
                      placeholder="[ Nhập lệnh truy vấn hệ thống... ]" 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} 
                  />
                  <button 
                      onClick={handleSendChat} 
                      disabled={chatLoading || !chatInput.trim()} 
                      className="bg-blue-600 hover:bg-blue-700 text-white w-14 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:hover:bg-blue-600 shadow-sm transition-all border border-blue-700"
                  >
                      ➤
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}