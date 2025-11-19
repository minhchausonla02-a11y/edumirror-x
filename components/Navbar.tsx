// components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // --- LOGIC MỚI: WHITELIST (DANH SÁCH CHO PHÉP) ---
  // Chỉ hiển thị menu nếu đường dẫn thuộc danh sách các trang giáo viên
  const isTeacherPage = 
    pathname === "/" ||                 // Trang chủ
    pathname?.startsWith("/upload") ||    // Trang tải giáo án
    pathname?.startsWith("/dashboard") || // Trang Dashboard
    pathname?.startsWith("/ai-suggest") || // Trang Gợi ý AI
    pathname?.startsWith("/analyze");      // Trang phân tích (nếu có)

  return (
    <nav className="p-4 border-b flex justify-between items-center bg-white shadow-sm">
      {/* Logo luôn hiển thị để bấm về trang chủ */}
      <Link href="/" className="text-xl font-bold text-blue-700">
        EduMirror X
      </Link>

      {/* CHỈ HIỂN THỊ MENU KHI LÀ TRANG GIÁO VIÊN */}
      {isTeacherPage && (
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/upload" className="hover:text-blue-600 transition-colors">
            Tải giáo án
          </Link>
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link href="/ai-suggest" className="hover:text-blue-600 transition-colors">
            Gợi ý AI
          </Link>
        </div>
      )}
    </nav>
  );
}