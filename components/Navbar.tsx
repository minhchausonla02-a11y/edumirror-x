"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const searchParams = useSearchParams();
  const isSurveyPage = !!searchParams.get("id"); // Nếu có id khảo sát thì ẩn menu

  // Logic ẩn menu nếu đang ở link khảo sát (có tham số id) hoặc đường dẫn bắt đầu bằng /survey
  if (isSurveyPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-blue-700 text-xl">
          EduMirror X
        </Link>

        <nav className="text-sm text-gray-600 flex gap-5">
          {/* SỬA LINK: Dùng ?tab=... thay vì #... */}
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
      </div>
    </header>
  );
}