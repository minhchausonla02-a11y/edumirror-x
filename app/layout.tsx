// app/layout.tsx
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Link from "next/link";

export const metadata = {
  title: "EduMirror X",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900">
        <AppProvider>
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              {/* Logo / Home */}
              <Link href="/" className="font-semibold">
                EduMirror X
              </Link>

              {/* Thanh tab */}
              <nav className="text-sm text-gray-600 flex gap-5">
                {/* Quay về trang chính và cuộn tới khu TẢI GIÁO ÁN */}
                <Link href="/#upload" className="hover:text-blue-600">
                  Tải giáo án
                </Link>

                {/* Quay về trang chính và cuộn tới khu KHẢO SÁT (preview + QR) */}
                <Link href="/#survey" className="hover:text-blue-600">
                  Khảo sát
                </Link>

                {/* Dashboard thống kê 60s */}
                <Link href="/dashboard" className="hover:text-blue-600">
                  Dashboard
                </Link>

                {/* Gợi ý AI (trong Dashboard, section có id="ai") */}
                <Link href="/dashboard#ai" className="hover:text-blue-600">
                  Gợi ý AI
                </Link>
              </nav>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

          <footer className="text-center text-xs text-gray-500 py-6">
            © {new Date().getFullYear()} EduMirror X
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
