import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 🚀 NÂNG CẤP THÔNG TIN DỰ ÁN CHO TAB TRÌNH DUYỆT
export const metadata: Metadata = {
  title: "EduMirror X | Lõi AI Phân Tích Sư Phạm",
  description: "Hệ thống Trợ lý phản chiếu học tập và phân tích sư phạm bằng AI (Dự án Khoa học Kỹ thuật)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      {/* Thêm bg-[#091128] text-white antialiased trực tiếp vào body để chống chớp màn hình trắng khi tải trang */}
      <body className={`${inter.className} bg-[#091128] text-white antialiased min-h-screen`}>
        {/* Đã xóa <UserProfile /> ở đây vì nó đã được tích hợp vào Header của từng trang */}
        {children}
      </body>
    </html>
  );
}