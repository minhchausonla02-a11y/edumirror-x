// app/layout.tsx
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Navbar from "@/components/Navbar"; // 1. Import component mới

export const metadata = { title: "EduMirror X" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 text-gray-900">
        <AppProvider>
          {/* 2. Thay thế đoạn code header dài dòng cũ bằng dòng này */}
          <Navbar /> 
          
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>

          <footer className="text-center text-xs text-gray-500 py-6">
            © {new Date().getFullYear()} EduMirror X
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}