import { Suspense } from "react";
import SurveyPageClient from "./SurveyPageClient";

export const dynamic = "force-dynamic";

export default function SurveyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header đơn giản dùng chung style với app */}
      <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <div className="text-xl font-bold text-indigo-700">EduMirror X</div>
          <nav className="text-sm text-neutral-600 flex gap-4">
            <span className="font-medium text-indigo-700">Khảo sát</span>
          </nav>
        </div>
      </header>

      {/* Bọc client component trong Suspense như Next.js yêu cầu */}
      <Suspense
        fallback={
          <main className="mx-auto max-w-4xl px-6 py-8">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              Đang tải phiếu khảo sát, vui lòng đợi...
            </div>
          </main>
        }
      >
        <SurveyPageClient />
      </Suspense>
    </div>
  );
}
