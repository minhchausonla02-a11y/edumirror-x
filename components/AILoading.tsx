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
    // Màn hình nền mờ che phủ toàn bộ (Sử dụng overlay xám nhạt thay vì đen tuyền)
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/30 backdrop-blur-md animate-fade-in">
      
      {/* KHỐI KÍNH MỜ (GLASS HUD) - Chuẩn Light Theme */}
      <div className="relative bg-white/90 p-10 md:p-14 rounded-[2rem] border border-blue-100 shadow-2xl flex flex-col items-center max-w-lg w-[90%] mx-4 overflow-hidden">
        
        {/* Hiệu ứng ánh sáng nền mờ bên trong khối */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-blue-50 to-indigo-50 blur-3xl pointer-events-none"></div>

        {/* LÕI RADAR XOAY (Sư phạm & Điềm tĩnh) */}
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          {/* Vòng ngoài cùng (Xoay xuôi chiều - Màu xanh chủ đạo) */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-500 shadow-sm animate-[spin_2s_linear_infinite] opacity-80"></div>
          
          {/* Vòng giữa (Xoay ngược chiều - Màu Indigo) */}
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-indigo-400 shadow-sm animate-[spin_1.5s_linear_infinite_reverse] opacity-90"></div>
          
          {/* Lõi sáng nhấp nháy bên trong */}
          <div className="absolute inset-6 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-md animate-pulse opacity-50"></div>
          
          {/* Biểu tượng trung tâm */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <span className="text-4xl drop-shadow-sm">✨</span> 
          </div>
        </div>
        
        {/* VĂN BẢN ĐIỀU KHIỂN (Thay đổi chữ mỗi 2.5s) */}
        <h3 className="relative z-10 text-base md:text-lg font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 uppercase text-center min-w-[300px] transition-all duration-500">
          {messages[currentMsg]}
        </h3>
        
        <p className="relative z-10 mt-5 text-[11px] md:text-xs text-slate-500 font-mono tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-ping"></span>
          Hệ thống đang xử lý, vui lòng không tắt trình duyệt...
        </p>

        {/* THANH TIA LASER CHẠY (SCANNER BAR) */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent w-[200%] animate-[translate-x_2s_linear_infinite] transform -translate-x-full"></div>
        </div>

      </div>
    </div>
  )
}