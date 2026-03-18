"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function AISuggestionsView({ lessonText, apiKey, model }: any) {
  
  // 🚀 BỘ LỌC ĐẶC BIỆT: Đã được cấu hình lại để ép HTML của AI về chuẩn DARK-SCIFI
  const processAIHtml = (content: string) => {
    if (!content) return "";
    
    // 1. DỌN RÁC MARKDOWN: Xóa bỏ chuỗi ```html và ``` bị kẹt ở đầu/cuối
    let processed = content.replace(/```html/gi, '').replace(/```/g, '').trim();
    
    // 2. Render Toán học
    processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$1$$').replace(/\\\((.*?)\\\)/gs, '$$$1$$');
    
    // 3. LỘT XÁC TAILWIND LIGHT SANG DARK-SCIFI BẰNG REGEX DIỆN RỘNG
    processed = processed
      .replace(/bg-[a-zA-Z]+-50/g, "bg-[#12254a]/60 backdrop-blur-sm shadow-[inset_0_0_15px_rgba(0,229,255,0.05)]")
      .replace(/bg-[a-zA-Z]+-100/g, "bg-[#091128]/80")
      .replace(/bg-white/g, "bg-transparent")
      .replace(/text-[a-zA-Z]+-800/g, "text-white font-medium drop-shadow-sm")
      .replace(/text-[a-zA-Z]+-900/g, "text-white font-bold")
      .replace(/text-[a-zA-Z]+-700/g, "text-[#00ff9d]") 
      .replace(/text-[a-zA-Z]+-600/g, "text-[#00e5ff]") 
      .replace(/border-[a-zA-Z]+-(200|300)/g, "border-[#1c3664] hover:border-[#00e5ff]/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]");

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
      }, 15000); 
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

  // ============================================================================
  // 🚀 ĐÃ SỬA: HÀM PHÂN TÍCH (GỬI KÈM GEMINI KEY TỪ BỘ NHỚ)
  // ============================================================================
  const handleAnalyze = async () => {
    if (!stats) return;
    setLoading(true);
    try {
      // Đọc Key Gemini riêng biệt từ Local Storage
      const savedGeminiKey = localStorage.getItem("geminiKey") || localStorage.getItem("edumirror_gemini_key") || localStorage.getItem("gemini_key");

      const res = await fetch("/api/get-solution", { // Hoặc thay bằng đúng endpoint của bạn nếu là /api/generate-solution
        method: "POST",
        body: JSON.stringify({ 
            stats, 
            lessonText, 
            apiKey, 
            geminiKey: savedGeminiKey, // Bơm Key trả phí vào
            model 
        }) 
      });
      const data = await res.json();
      
      if (data.error) {
          alert("Hệ thống báo lỗi: " + data.error);
      } else {
          setSolution(data.result);
      }
    } catch (e) {
      alert("Lỗi kết nối AI");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 🚀 ĐÃ SỬA: HÀM CHAT (GỬI KÈM GEMINI KEY TỪ BỘ NHỚ)
  // ============================================================================
  // ============================================================================
  // 🚀 ĐÃ SỬA: HÀM CHAT (GỬI KÈM TRÍ NHỚ VÀ GEMINI KEY TỪ BỘ NHỚ)
  // ============================================================================
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    // LƯU Ý: Lấy chatHistory hiện tại (trước khi push câu mới vào) để làm trí nhớ gửi đi
    const currentHistory = [...chatHistory]; 
    
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Đọc Key Gemini riêng biệt từ Local Storage
      const savedGeminiKey = localStorage.getItem("geminiKey") || localStorage.getItem("edumirror_gemini_key") || localStorage.getItem("gemini_key");

      const res = await fetch("/api/chat-with-ai", {
        method: "POST",
        body: JSON.stringify({ 
            question: userMsg,
            history: currentHistory, // 🚀 BƠM TRÍ NHỚ VÀO CHO AI
            context: { diagnosis: JSON.stringify(stats), currentSolution: solution },
            apiKey,
            geminiKey: savedGeminiKey, // Bơm Key trả phí vào
            model
        })
      });
      const data = await res.json();
      
      if (data.error) {
          setChatHistory(prev => [...prev, { role: 'ai', content: `⚠️ HỆ THỐNG BÁO LỖI: ${data.error}` }]);
      } else {
          setChatHistory(prev => [...prev, { role: 'ai', content: data.result }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ MẤT KẾT NỐI TỚI TRUNG TÂM PHÂN TÍCH. VUI LÒNG THỬ LẠI." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-12 max-w-6xl mx-auto text-white">
      
      {/* --- PHẦN 1: HEADER TRẠM ĐIỀU KHIỂN --- */}
      <div className="bg-[#12254a]/40 backdrop-blur-xl p-6 rounded-[2rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.05)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#00e5ff]/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
         
         <div className="flex items-center gap-5 z-10">
            <div className="w-16 h-16 bg-[#040b16] border border-[#00e5ff]/50 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(0,229,255,0.3)] drop-shadow-md">
                🤖
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-[#00e5ff] uppercase tracking-widest drop-shadow-[0_0_8px_#00e5ff]">
                    CỐ VẤN SƯ PHẠM AI
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-[#8b9bc0] uppercase tracking-widest bg-[#091128] border border-[#1c3664] px-2 py-1 rounded">Engine: <span className="font-bold text-[#00e5ff]">{model}</span></span>
                    <span className="text-[10px] text-[#00ff9d] font-mono flex items-center gap-1.5 drop-shadow-[0_0_5px_#00ff9d]"><span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse shadow-[0_0_5px_#00ff9d]"></span> Kích hoạt phân tích 4 tầng</span>
                </div>
            </div>
         </div>
         
         {/* TÁCH LOGIC ĐIỀU KIỆN ĐỂ TRÁNH VERCEL BUILD ERROR */}
         {!solution && stats && loading && (
            <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-[#040b16] rounded-xl border border-[#00e5ff]/40 shadow-[inset_0_0_20px_rgba(0,229,255,0.1)] w-full md:w-[400px]">
                <div className="relative flex items-center justify-center h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-[#00e5ff] animate-spin shadow-[0_0_10px_#00e5ff]"></div>
                    <div className="absolute inset-2 rounded-full border-l-2 border-r-2 border-[#2196f3] animate-[spin_2s_linear_reverse] shadow-[0_0_8px_#2196f3]"></div>
                    <div className="text-[#00e5ff] text-[10px] font-bold drop-shadow-[0_0_5px_#00e5ff]">AI</div>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-[#00e5ff] font-medium animate-pulse text-sm transition-all duration-500 min-h-[40px] flex items-center justify-center font-mono drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">
                        {loadingMessages[loadingIndex]}
                    </p>
                </div>
            </div>
         )}

         {!solution && stats && !loading && (
            <button 
                onClick={handleAnalyze} 
                className="w-full md:w-auto bg-gradient-to-r from-[#00e5ff] to-[#2196f3] text-[#040b16] hover:shadow-[0_0_25px_rgba(0,229,255,0.8)] px-8 py-4 rounded-xl font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all z-10 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
                ✨ KÍCH HOẠT QUY TRÌNH
            </button>
         )}
      </div>

      {/* HIỂN THỊ NỘI DUNG GIẢI PHÁP - ĐÃ TÁCH KHỐI ĐỂ AN TOÀN */}
      {solution && (
        <div className="animate-fade-in-up bg-[#12254a]/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.1)] relative">
            
            {/* Vùng hiển thị Markdown */}
            <div className="prose max-w-none 
                prose-headings:text-[#00e5ff] prose-headings:uppercase prose-headings:tracking-wider prose-headings:font-bold prose-headings:drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]
                prose-h3:text-lg prose-h3:border-b prose-h3:border-[#1c3664] prose-h3:pb-2 prose-h3:text-[#00e5ff]
                prose-p:text-white prose-p:leading-relaxed
                prose-strong:text-[#00ff9d] prose-strong:font-extrabold prose-strong:drop-shadow-[0_0_3px_rgba(0,255,157,0.5)]
                prose-ul:text-[#8b9bc0] prose-li:marker:text-[#00e5ff]
                prose-blockquote:border-l-[#00e5ff] prose-blockquote:bg-[#00e5ff]/10 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-white prose-blockquote:shadow-inner
                [&_ol]:space-y-2 [&_ul]:space-y-2
                katex-display:text-center katex-display:my-4 katex-display:text-xl katex-display:text-[#00ff9d] katex-display:drop-shadow-[0_0_8px_#00ff9d]
                [&_.katex]:text-[#00ff9d] font-mono text-sm
                [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!shadow-none [&_div]:!text-white [&_p]:!text-white [&_span]:!text-white"
                dangerouslySetInnerHTML={{ __html: processAIHtml(solution) }}
            ></div>
            
            <div className="mt-10 text-right border-t border-[#1c3664] pt-6">
                <button onClick={() => { setSolution(null); localStorage.removeItem("current_stats"); }} className="text-[11px] font-bold text-[#8b9bc0] uppercase tracking-widest hover:text-[#ff003c] hover:drop-shadow-[0_0_5px_#ff003c] transition-all border border-transparent hover:border-[#ff003c]/50 hover:bg-[#ff003c]/10 px-4 py-2 rounded-lg">
                    [ ⚠️ KHÔI PHỤC & ĐẶT LẠI HỆ THỐNG ]
                </button>
            </div>
        </div>
      )}

      {/* HIỂN THỊ MÀN HÌNH CHỜ NẾU CHƯA CÓ STATS */}
      {!solution && !stats && (
        <div className="text-center py-28 bg-[#12254a]/40 backdrop-blur-xl rounded-[3rem] border border-[#1c3664] shadow-sm">
            <div className="text-5xl opacity-30 mb-6 drop-shadow-[0_0_10px_#00e5ff]">🔌</div>
            <p className="text-lg font-bold text-[#8b9bc0] tracking-widest uppercase">Mất kết nối Dữ liệu Lõi</p>
            <p className="text-xs text-[#1c3664] mt-2 font-mono">Vui lòng quay lại Trạm Báo Cáo và ấn nút "TƯ VẤN SƯ PHẠM →".</p>
        </div>
      )}

      {/* --- PHẦN 2: KHUNG CHAT SƯ PHẠM (SECURE COMMS CHANNEL) --- */}
      {solution && (
          <div className="mt-8 bg-[#091128] rounded-[2rem] border border-[#1c3664] shadow-[0_0_20px_rgba(0,229,255,0.05)] overflow-hidden flex flex-col h-[600px] relative">
              {/* Header Chat */}
              <div className="bg-[#12254a]/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-[#1c3664] shadow-sm z-10">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#040b16] border border-[#00e5ff]/30 rounded-xl flex items-center justify-center shadow-[inset_0_0_8px_rgba(0,229,255,0.2)]">👨‍🏫</div>
                      <div>
                          <div className="font-bold text-xs text-white uppercase tracking-widest drop-shadow-sm">Kênh Liên Lạc Bảo Mật</div>
                          <div className="text-[10px] text-[#00e5ff] font-mono mt-0.5">ID: {model}</div>
                      </div>
                  </div>
                  <div className="flex gap-1.5 items-center">
                      <span className="text-[9px] uppercase tracking-widest font-mono text-[#00ff9d]">Online</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00ff9d] shadow-[0_0_8px_#00ff9d] animate-pulse"></div>
                  </div>
              </div>

              {/* Nội dung Chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-transparent relative custom-scrollbar z-0">
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] -z-10"></div>
                  
                  {/* Lời chào AI */}
                  <div className="flex gap-4">
                      <div className="w-10 h-10 bg-[#040b16] border border-[#00e5ff]/50 text-[#00e5ff] rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.2)]">🤖</div>
                      <div className="bg-[#12254a]/60 backdrop-blur-sm p-4 rounded-2xl rounded-tl-sm border border-[#1c3664] shadow-sm text-sm text-white max-w-[85%] font-mono leading-relaxed">
                          Quá trình giải mã hoàn tất. Thầy/cô cần trích xuất thêm dữ liệu hoặc chi tiết hóa phương pháp nào không? (Gợi ý: "Lập bảng tóm tắt lỗi sai").
                      </div>
                  </div>

                  {/* Lịch sử Chat */}
                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold shadow-sm border 
                              ${msg.role === 'user' ? 'bg-[#00e5ff] border-[#00e5ff] text-[#040b16] shadow-[0_0_10px_#00e5ff]' : 'bg-[#040b16] border-[#00e5ff]/50 text-[#00e5ff]'}`}>
                              {msg.role === 'user' ? 'T' : '🤖'}
                          </div>
                          
                          <div className={`p-4 rounded-2xl shadow-sm text-sm max-w-[85%] overflow-x-auto leading-relaxed font-mono
                              ${msg.role === 'user' ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] rounded-tr-sm backdrop-blur-sm' : 'bg-[#12254a]/60 border border-[#1c3664] text-white rounded-tl-sm backdrop-blur-sm'}`}>
                                <div className="prose max-w-none prose-p:my-1 prose-pre:bg-[#040b16] prose-pre:border prose-pre:border-[#1c3664] prose-code:text-[#00ff9d] katex-display:text-[#00ff9d] katex-display:drop-shadow-[0_0_5px_#00ff9d] [&_.katex]:text-[#00ff9d] prose-strong:text-[#00e5ff] prose-headings:text-white">
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

                  {/* Hiệu ứng AI Đang gõ (Typing) */}
                  {chatLoading && (
                      <div className="flex gap-4 animate-fade-in">
                          <div className="w-10 h-10 bg-[#040b16] border border-[#00e5ff]/50 text-[#00e5ff] rounded-full flex items-center justify-center text-lg shadow-[0_0_10px_rgba(0,229,255,0.2)]">🤖</div>
                          <div className="bg-[#12254a]/60 backdrop-blur-sm p-4 rounded-2xl rounded-tl-sm border border-[#1c3664] shadow-sm flex items-center">
                              <div className="flex gap-1.5">
                                  <div className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce shadow-[0_0_5px_#00e5ff]"></div>
                                  <div className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce shadow-[0_0_5px_#00e5ff]" style={{animationDelay: '0.15s'}}></div>
                                  <div className="w-2 h-2 bg-[#00e5ff] rounded-full animate-bounce shadow-[0_0_5px_#00e5ff]" style={{animationDelay: '0.3s'}}></div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Chat */}
              <div className="p-4 bg-[#040b16] border-t border-[#1c3664] flex gap-3 z-10">
                  <input 
                      type="text" 
                      className="flex-1 bg-[#091128] border border-[#1c3664] rounded-xl px-5 py-4 text-sm text-white focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/50 outline-none font-mono placeholder:text-[#8b9bc0] transition-all shadow-inner" 
                      placeholder="[ Nhập lệnh truy vấn hệ thống... ]" 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} 
                  />
                  <button 
                      onClick={handleSendChat} 
                      disabled={chatLoading || !chatInput.trim()} 
                      className="bg-[#00e5ff] hover:bg-white text-[#040b16] w-14 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:hover:bg-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all font-bold text-lg"
                  >
                      ➤
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}