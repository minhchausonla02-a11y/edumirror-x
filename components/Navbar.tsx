"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// 1. Tách logic Navbar ra thành một component con
function NavbarContent() {
  const searchParams = useSearchParams();
  const isSurveyPage = !!searchParams.get("id"); // Nếu có id khảo sát thì ẩn menu

  // Logic ẩn menu nếu đang ở link khảo sát
  if (isSurveyPage) {
    return null;
  }

  return (
    <nav className="text-sm text-gray-600 flex gap-5">
      <Link href="/?tab=upload" className="hover:text-blue-600 transition-colors">
        Tải giáo án
      </Link>

      <Link href="/?tab=dashboard" className="hover:text-blue-600 transition-colors">
        Dashboard
      </Link>

      <Link href="/?tab=ai" className="hover:text-blue-600 transition-colors">
        Gợi ý AI
      </Link>
    </nav>
  );
}

// 2. Component chính sẽ bọc Suspense bên ngoài
export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-blue-700 text-xl">
          EduMirror X
        </Link>

        {/* BỌC SUSPENSE ĐỂ TRÁNH LỖI BUILD 404 */}
        <Suspense fallback={<div className="text-sm text-gray-400">Đang tải menu...</div>}>
          <NavbarContent />
        </Suspense>
      </div>
    </header>
  );
}