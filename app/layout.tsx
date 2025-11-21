import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduMirror X",
  description: "Trợ lý phản chiếu học tập bằng AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {/* QUAN TRỌNG: Ở đây chỉ để children, KHÔNG ĐƯỢC ĐỂ Navbar hay Header nào cả */}
        {children}
      </body>
    </html>
  );
}