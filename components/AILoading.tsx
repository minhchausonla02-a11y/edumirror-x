'use client'
import { useEffect, useState } from 'react'

export default function AILoading() {
  // Những câu thoại AI sẽ nói trong lúc chờ (Giữ nguyên logic của bạn)
  const messages = [
    "🤖 AI đang đọc nội dung giáo án...",
    "🧠 Đang phân tích cấu trúc bài học...",
    "🔍 Đang rà soát các tiêu chí sư phạm...",
    "✍️ Đang soạn câu hỏi trắc nghiệm...",
    "🎨 Đang thiết kế giao diện phiếu...",
    "✨ Đang hoàn thiện sản phẩm..."
  ];

  const [currentMsg, setCurrentMsg] = useState(0);

  useEffect(() => {
    // Cứ 2.5 giây đổi câu thoại một lần
    const timer = setInterval(() => {
      setCurrentMsg((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    // Màn hình nền mờ che phủ toàn bộ (Đổi overlay tối hơn để tôn khối trung tâm lên)
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#040b16]/80 backdrop-blur-md animate-fade-in">
      
      {/* KHỐI KÍNH MỜ (GLASS HUD) - Chuẩn Dark-SciFi */}
      <div className="relative bg-[#12254a]/50 p-10 md:p-14 rounded-[2rem] border border-[#1c3664] shadow-[0_0_30px_rgba(0,229,255,0.15)] flex flex-col items-center max-w-lg w-[90%] mx-4 overflow-hidden backdrop-blur-xl">
        
        {/* Hiệu ứng ánh sáng nền mờ bên trong khối */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00e5ff]/15 via-transparent to-transparent blur-3xl pointer-events-none"></div>

        {/* LÕI RADAR XOAY (Sư phạm & Điềm tĩnh) */}
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          {/* Vòng ngoài cùng (Xoay xuôi chiều - Màu Cyan phát sáng) */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.6)] animate-[spin_2s_linear_infinite] opacity-90"></div>
          
          {/* Vòng giữa (Xoay ngược chiều - Màu Blue) */}
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-[#2196f3] shadow-[0_0_10px_rgba(33,150,243,0.5)] animate-[spin_1.5s_linear_infinite_reverse] opacity-80"></div>
          
          {/* Lõi sáng nhấp nháy bên trong */}
          <div className="absolute inset-6 bg-gradient-to-br from-[#00e5ff] to-[#2196f3] rounded-full blur-md animate-pulse opacity-30"></div>
          
          {/* Biểu tượng trung tâm */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <span className="text-4xl drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]">✨</span> 
          </div>
        </div>
        
        {/* VĂN BẢN ĐIỀU KHIỂN (Thay đổi chữ mỗi 2.5s) */}
        <h3 className="relative z-10 text-base md:text-lg font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-white uppercase text-center min-w-[300px] transition-all duration-500 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
          {messages[currentMsg]}
        </h3>
        
        <p className="relative z-10 mt-5 text-[11px] md:text-xs text-[#8b9bc0] font-mono tracking-wider flex items-center gap-2">
          {/* Đèn tín hiệu nhấp nháy - Đổi sang Cyan */}
          <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.8)] animate-ping"></span>
          Hệ thống đang xử lý, vui lòng không tắt trình duyệt...
        </p>

        {/* THANH TIA LASER CHẠY (SCANNER BAR) */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1c3664] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent w-[200%] animate-[translate-x_2s_linear_infinite] transform -translate-x-full"></div>
        </div>

      </div>
    </div>
  )
}