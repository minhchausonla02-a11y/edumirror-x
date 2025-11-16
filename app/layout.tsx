import "./globals.css";
import Link from "next/link";
import { AppProvider } from "@/lib/store";

export const metadata = { title: "EduMirror X" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900">
        <AppProvider>
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="font-semibold">EduMirror X</div>

              {/* Thanh menu 4 tab */}
              <nav className="text-sm text-gray-600 flex gap-5">
                {/* Trang phân tích giáo án (mặc định là / ) */}
                <Link href="/" className="hover:text-blue-600">
                  Tải giáo án
                </Link>

                {/* Trang tạo / xem khảo sát 60s */}
                <Link href="/survey" className="hover:text-blue-600">
                  Khảo sát
                </Link>

                {/* Trang Dashboard thống kê 60s */}
                <Link href="/dashboard" className="hover:text-blue-600">
                  Dashboard
                </Link>

                {/* Khu Gợi ý AI trong Dashboard */}
                <Link href="/dashboard#ai" className="hover:text-blue-600">
                  Gợi ý AI
                </Link>
              </nav>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

          <footer className="text-center text-xs text-gray-500 py-6">
            © {year} EduMirror X
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
