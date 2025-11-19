"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();

  // --- LOGIC 1: ẨN MENU HỌC SINH ---
  // Nếu đường dẫn bắt đầu bằng "/survey", component này sẽ trả về null (không hiện gì cả)
  if (pathname?.startsWith("/survey")) {
    return null;
  }

  // --- LOGIC 2: HIỂN THỊ MENU GIÁO VIÊN ---
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo: Bấm vào sẽ reload về trang chủ sạch */}
        <Link href="/" className="font-semibold text-blue-700 text-xl">
          EduMirror X
        </Link>

        <nav className="text-sm text-gray-600 flex gap-5">
          {/* QUAN TRỌNG: Dùng "/#" thay vì "/" để tránh lỗi 404 
             Hệ thống sẽ hiểu là "Về trang chủ và cuộn tới phần Dashboard"
          */}
          
          <Link href="/#upload" className="hover:text-blue-600 transition-colors">
            Tải giáo án
          </Link>

          <Link href="/#dashboard" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>

          <Link href="/#ai" className="hover:text-blue-600 transition-colors">
            Gợi ý AI
          </Link>
        </nav>
      </div>
    </header>
  );
}