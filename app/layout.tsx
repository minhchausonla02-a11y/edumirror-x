import "./globals.css";
import { AppProvider } from "@/lib/store";

export const metadata = { title: "EduMirror X" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900">
        <AppProvider>
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="font-semibold">EduMirror X</div>
              <nav className="text-sm text-gray-600 flex gap-5">
                <a href="#upload" className="hover:text-blue-600">Tải giáo án</a>
      
                <a href="#dashboard" className="hover:text-blue-600">Dashboard</a>
                <a href="#ai" className="hover:text-blue-600">Gợi ý AI</a>
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
