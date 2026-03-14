"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function AISuggestionsView({ lessonText, apiKey, model }: any) {
  const preprocessLaTeX = (content: string) => {
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
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Mất kết nối tới trung tâm thần kinh. Vui lòng thử lại." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12 max-w-6xl mx-auto">
      
      {/* --- PHẦN 1: HEADER TRẠM ĐIỀU KHIỂN --- */}
      <div className="bg-[#0A0A12]/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>
         
         <div className="flex items-center gap-5 z-10">
            <div className="w-16 h-16 bg-[#05050A] border border-purple-500/30 rounded-2xl flex items-center justify-center text-3xl shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]">
               🤖
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                    Cố vấn Sư phạm Lượng tử
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Engine: <span className="font-bold text-purple-400">{model}</span></span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Kích hoạt phân tích 4 tầng</span>
                </div>
            </div>
         </div>
         
         {/* Nút bấm chỉ hiện khi chưa có giải pháp */}
         {!solution && stats && (
             <button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold tracking-widest uppercase shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all z-10 border border-white/10"
             >
                {loading ? "⏳ ĐANG PHÂN TÍCH LÕI..." : "✨ KÍCH HOẠT QUY TRÌNH"}
             </button>
         )}
      </div>

      {/* HIỂN THỊ NỘI DUNG GIẢI PHÁP */}
      {solution ? (
        <div className="animate-fade-in-up bg-[#0D0D18] p-8 md:p-10 rounded-[2.5rem] border border-purple-500/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 via-blue-500 to-transparent opacity-80"></div>
            
            {/* Vùng hiển thị Markdown tùy chỉnh CSS cho Dark Mode */}
            <div className="prose prose-invert max-w-none 
                prose-headings:text-purple-300 prose-headings:uppercase prose-headings:tracking-wider prose-headings:font-bold
                prose-h3:text-lg prose-h3:border-b prose-h3:border-white/5 prose-h3:pb-2 prose-h3:text-blue-400
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-strong:text-purple-400 prose-strong:font-extrabold
                prose-ul:text-gray-400 prose-li:marker:text-purple-500
                prose-blockquote:border-l-purple-500 prose-blockquote:bg-white/5 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                [&_ol]:space-y-2 [&_ul]:space-y-2
                katex-display:text-center katex-display:my-4 katex-display:text-xl katex-display:text-emerald-300
                [&_.katex]:text-emerald-300 font-mono text-sm"
                dangerouslySetInnerHTML={{ __html: preprocessLaTeX(solution) }}
            ></div>
            
            <div className="mt-10 text-right border-t border-white/10 pt-6">
                <button onClick={() => { setSolution(null); localStorage.removeItem("current_stats"); }} className="text-[11px] font-bold text-gray-500 uppercase tracking-widest hover:text-red-400 transition-colors border border-transparent hover:border-red-400/50 px-4 py-2 rounded-lg">
                    [ ⚠️ RESET TOÀN BỘ PHÂN TÍCH ]
                </button>
            </div>
        </div>
      ) : !stats && (
        <div className="text-center py-28 bg-[#0D0D18] rounded-[3rem] border border-white/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
            <div className="text-5xl opacity-30 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">🔌</div>
            <p className="text-lg font-bold text-gray-400 tracking-widest uppercase">Mất kết nối Dữ liệu</p>
            <p className="text-xs text-gray-600 mt-2 font-mono">Vui lòng quay lại Trạm Báo Cáo và ấn nút "YÊU CẦU GIẢI PHÁP SƯ PHẠM".</p>
        </div>
      )}

      {/* --- PHẦN 2: KHUNG CHAT (TERMINAL) --- */}
      {solution && (
          <div className="mt-8 bg-[#05050A] rounded-[2rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[600px] relative">
              {/* Header Chat */}
              <div className="bg-[#0A0A12] p-4 flex items-center justify-between border-b border-white/5 shadow-md z-10">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/50 rounded-xl flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">👨‍🏫</div>
                      <div>
                          <div className="font-bold text-xs text-gray-200 uppercase tracking-widest">Kênh Liên Lạc Mật</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {model}</div>
                      </div>
                  </div>
                  <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                  </div>
              </div>

              {/* Nội dung Chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-transparent relative custom-scrollbar z-0">
                  {/* Watermark Logo chìm */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[150px] opacity-[0.02] pointer-events-none">🤖</div>

                  {/* Lời chào AI */}
                  <div className="flex gap-4">
                      <div className="w-10 h-10 bg-[#0A0A12] border border-white/10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-inner">🤖</div>
                      <div className="bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/10 shadow-lg text-sm text-gray-300 max-w-[85%] font-mono leading-relaxed backdrop-blur-md">
                          Quá trình giải mã hoàn tất. Thầy/cô cần trích xuất thêm dữ liệu hoặc chi tiết hóa phương pháp nào không? (Gợi ý: "Lập bảng tóm tắt lỗi sai").
                      </div>
                  </div>

                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-lg border 
                              ${msg.role === 'user' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-[#0A0A12] border-white/10 text-gray-300'}`}>
                              {msg.role === 'user' ? 'T' : '🤖'}
                          </div>
                          
                          <div className={`p-4 rounded-2xl shadow-lg text-sm max-w-[85%] overflow-x-auto backdrop-blur-md leading-relaxed font-mono
                              ${msg.role === 'user' ? 'bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-tr-sm' : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-sm'}`}>
                                
                                {/* 👇 ĐÃ SỬA LỖI TYPESCRIPT Ở ĐÂY: Bọc thẻ div ra ngoài */}
                                <div className="prose prose-invert max-w-none prose-p:my-1 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:text-emerald-300 katex-display:text-emerald-300 [&_.katex]:text-emerald-300">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {preprocessLaTeX(msg.content)}
                                    </ReactMarkdown>
                                </div>
                          </div>
                      </div>
                  ))}

                  {chatLoading && (
                      <div className="flex gap-4 animate-fade-in">
                          <div className="w-10 h-10 bg-[#0A0A12] border border-white/10 rounded-full flex items-center justify-center text-lg shadow-inner">🤖</div>
                          <div className="bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/10 shadow-lg backdrop-blur-md">
                              <div className="flex gap-1.5">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce shadow-[0_0_8px_#a855f7]"></div>
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce shadow-[0_0_8px_#a855f7]" style={{animationDelay: '0.15s'}}></div>
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce shadow-[0_0_8px_#a855f7]" style={{animationDelay: '0.3s'}}></div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Chat */}
              <div className="p-4 bg-[#0A0A12] border-t border-white/5 flex gap-3 z-10">
                  <input 
                      type="text" 
                      className="flex-1 bg-[#05050A] border border-white/10 rounded-xl px-5 py-4 text-sm text-gray-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none font-mono placeholder:text-gray-600 transition-all shadow-inner" 
                      placeholder="[ Nhập lệnh truy vấn hệ thống... ]" 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} 
                  />
                  <button 
                      onClick={handleSendChat} 
                      disabled={chatLoading || !chatInput.trim()} 
                      className="bg-purple-600 hover:bg-purple-500 text-white w-14 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:hover:bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all border border-purple-400/50"
                  >
                      ➤
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}