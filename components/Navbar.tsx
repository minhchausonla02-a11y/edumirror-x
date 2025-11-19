// components/Navbar.tsx
"use client"; // Bắt buộc để dùng usePathname

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();

  // --- LOGIC QUAN TRỌNG: Ẩn Menu nếu đang ở trang khảo sát ---
  // Nếu đường dẫn bắt đầu bằng "/survey", component này sẽ trả về null (không vẽ gì cả)
  if (pathname?.startsWith("/survey")) {
    return null;
  }

  // Ngược lại, hiển thị Header bình thường
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="font-semibold text-blue-700">EduMirror X</div>
        <nav className="text-sm text-gray-600 flex gap-5">
          <Link href="/#upload" className="hover:text-blue-600">
            Tải giáo án
          </Link>
          <Link href="/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/#ai" className="hover:text-blue-600">
            Gợi ý AI
          </Link>
        </nav>
      </div>
    </header>
  );
}