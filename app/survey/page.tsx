import SurveyView, { SurveyV2 as SurveyV2UI } from "@/components/SurveyView";

type SurveyPageProps = {
  searchParams: {
    data?: string;
  };
};

export default function SurveyPage({ searchParams }: SurveyPageProps) {
  let survey: SurveyV2UI | null = null;

 if (searchParams.data) {
  try {
    // Giải mã JSON đã được encodeURIComponent
    const json = decodeURIComponent(searchParams.data);
    survey = JSON.parse(json);
  } catch (err) {
    console.error("Lỗi giải mã survey:", err);
  }
}


  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="max-w-md text-center bg-white shadow rounded-2xl p-6">
          <h1 className="text-lg font-semibold mb-2">
            Không tải được phiếu khảo sát
          </h1>
          <p className="text-sm text-neutral-600">
            Link không hợp lệ hoặc dữ liệu đã bị thay đổi. Vui lòng hỏi lại
            thầy/cô để nhận đường link mới.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">
            Phiếu 60 giây sau tiết học
          </h1>
          <p className="text-sm text-neutral-600">
            Phiếu hoàn toàn ẩn danh. Em trả lời thật lòng trong khoảng 1 phút
            để thầy/cô hiểu lớp hơn.
          </p>
        </div>

        <section className="mt-4 rounded-2xl border bg-white shadow-sm p-4">
          {/* SurveyView sẽ hiển thị giao diện câu hỏi */}
          <SurveyView survey={survey} />
        </section>
      </main>
    </div>
  );
}
