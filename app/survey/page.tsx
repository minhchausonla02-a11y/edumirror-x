import { Buffer } from "buffer";
import { decompressFromEncodedURIComponent } from "lz-string";
import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

type Props = {
  searchParams: {
    data?: string; // kiểu cũ (base64) – vẫn hỗ trợ
    z?: string;    // kiểu mới (nén)
  };
};

export default function SurveyPage({ searchParams }: Props) {
  let survey: SurveyV2UI | null = null;

  try {
    if (searchParams.z) {
      // 🔹 Kiểu mới: dữ liệu nén bằng lz-string
      const json = decompressFromEncodedURIComponent(searchParams.z);
      if (json) {
        survey = JSON.parse(json);
      }
    } else if (searchParams.data) {
      // 🔹 Kiểu cũ: base64 (để nếu sau này bạn vẫn dùng link cũ thì vẫn chạy)
      const base64 = searchParams.data;
      const json = Buffer.from(base64, "base64").toString("utf8");
      survey = JSON.parse(json);
    }
  } catch (e) {
    console.error("Không đọc được dữ liệu phiếu khảo sát:", e);
    survey = null;
  }

  if (!survey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-2xl bg-white shadow p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">
            Không tải được phiếu khảo sát
          </h1>
          <p className="text-sm text-neutral-600">
            Link không hợp lệ hoặc dữ liệu đã bị thay đổi. Vui lòng hỏi lại
            thầy/cô để nhận đường link mới.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow p-6">
        <SurveyView survey={survey} />
      </div>
    </main>
  );
}
