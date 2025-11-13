"use client";

import { useSearchParams } from "next/navigation";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

function decodeSurveyFromUrl(param: string | null): SurveyV2UI | null {
  if (!param) return null;
  try {
    const json = atob(decodeURIComponent(param));
    return JSON.parse(json);
  } catch (e) {
    console.error("Cannot decode survey from URL", e);
    return null;
  }
}

export default function StudentSurveyPage() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");
  const survey = decodeSurveyFromUrl(dataParam);

  if (!survey) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold mb-4">Phiếu 60 giây sau tiết học</h1>
          <p className="text-sm text-neutral-700">
            Link phiếu không hợp lệ hoặc chưa được thiết lập. Thầy/cô cần gửi đúng
            đường link có sẵn mã phiếu khảo sát.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Phần giới thiệu ngắn cho học sinh */}
        <div className="mb-4 text-sm text-neutral-700">
          <p className="font-medium">
            Phiếu 60 giây sau tiết học – dành cho học sinh
          </p>
          <p>
            Phiếu hoàn toàn ẩn danh. Em trả lời thật lòng để thầy/cô hiểu lớp hơn.
          </p>
        </div>

        {/* Dùng lại component SurveyView hiện tại */}
        <SurveyView survey={survey} />
      </div>
    </main>
  );
}
