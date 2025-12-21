'use client'
import { useEffect, useState } from 'react'

export default function AILoading() {
  // Những câu thoại AI sẽ nói trong lúc chờ
  const messages = [
    "🤖 AI đang đọc nội dung giáo án của thầy cô...",
    "🧠 Đang phân tích cấu trúc bài học...",
    "🔍 Đang rà soát các tiêu chí sư phạm...",
    "✍️ Đang soạn câu hỏi trắc nghiệm phù hợp...",
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
    // Màn hình mờ che phủ toàn bộ (Overlay)
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-2xl bg-white p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Hiệu ứng vòng xoay đẹp mắt */}
        <div className="relative mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          {/* Icon AI ở giữa */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <span className="text-3xl">✨</span> 
          </div>
        </div>
        
        {/* Dòng chữ thay đổi liên tục */}
        <h3 className="text-xl font-bold text-gray-800 min-w-[300px] text-center transition-all duration-500">
          {messages[currentMsg]}
        </h3>
        
        <p className="mt-3 text-sm text-gray-500">
          Hệ thống đang xử lý, vui lòng không tắt trình duyệt...
        </p>
      </div>
    </div>
  )
}