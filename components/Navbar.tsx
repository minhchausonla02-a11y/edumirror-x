// components/Navbar.tsx
"use client"; // Dòng này bắt buộc để dùng usePathname

import Link from "next/link";
import { usePathname } from "next/navigation"; // 1. Import hook này

export default function Navbar() {
  const pathname = usePathname(); // 2. Lấy đường dẫn hiện tại

  // 3. Kiểm tra xem có phải đang ở trang học sinh không
  // (Giả sử đường dẫn phiếu học sinh chứa chữ "survey" hoặc "phieu")
  const isStudentPage = pathname?.includes("/survey") || pathname?.includes("/phieu");

  return (
    <nav className="p-4 border-b flex justify-between items-center bg-white">
      {/* Logo luôn hiển thị */}
      <Link href="/" className="text-xl font-bold text-blue-700">
        EduMirror X
      </Link>

      {/* 4. Chỉ hiển thị các nút Menu nếu KHÔNG PHẢI trang học sinh */}
      {!isStudentPage && (
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/upload" className="hover:text-blue-600">
            Tải giáo án
          </Link>
          <Link href="/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/ai-suggest" className="hover:text-blue-600">
            Gợi ý AI
          </Link>
        </div>
      )}
    </nav>
  );
}