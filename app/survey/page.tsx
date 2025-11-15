// app/page.tsx

import { Suspense } from "react";
import EduMirrorApp from "@/components/EduMirrorApp";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Bọc toàn bộ app trong Suspense để thỏa điều kiện useSearchParams */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-10 text-sm text-neutral-500">
              Đang tải ứng dụng EduMirror X...
            </div>
          }
        >
          <EduMirrorApp />
        </Suspense>
      </main>
    </div>
  );
}
