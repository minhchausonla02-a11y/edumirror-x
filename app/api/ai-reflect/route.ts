import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const apiKey = body.apiKey as string | undefined;
    const stats = body.stats as {
      understood: number;
      notClear: number;
      tooFast: number;
      needExamples: number;
      total: number;
    };
    const lessonPlan = (body.lessonPlan as string | null) || "";
    const model = (body.model as string | undefined) || "gpt-4o-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu API Key, không thể gọi AI." },
        { status: 400 }
      );
    }

    if (!stats || typeof stats.total !== "number") {
      return NextResponse.json(
        { error: "Thiếu dữ liệu thống kê khảo sát." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });

    const summaryStats = `
Tổng phiếu: ${stats.total}
- Hiểu bài: ${stats.understood}
- Chưa rõ nội dung: ${stats.notClear}
- Tiết dạy hơi nhanh: ${stats.tooFast}
- Cần thêm ví dụ: ${stats.needExamples}
    `.trim();

    const lpText =
      lessonPlan && lessonPlan.length > 0
        ? lessonPlan.slice(0, 2500) // cắt bớt cho an toàn token
        : "Chưa cung cấp trích đoạn giáo án.";

    const prompt = `
Bạn là trợ lý sư phạm giúp giáo viên Toán THPT lớp đông (40–50 HS, vùng khó, nhiều em còn ngại phát biểu).

Dưới đây là **thống kê Phiếu 60s sau tiết học** và **trích đoạn giáo án**:

[THỐNG KÊ PHIẾU 60S]
${summaryStats}

[GIÁO ÁN / KẾ HOẠCH BÀI DẠY (TÓM TẮT)]
${lpText}

Hãy:
1) Nhận xét nhanh về mức độ hiểu bài của lớp (dựa vào số HS hiểu bài / chưa rõ / thấy nhanh / cần thêm ví dụ).
2) Chỉ ra 2–3 “điểm nghẽn” chính về sư phạm (tốc độ, ví dụ, hoạt động nhóm, thời gian luyện tập, v.v.).
3) Đề xuất tối đa 5 gợi ý điều chỉnh rất cụ thể cho TIẾT DẠY SAU, ví dụ:
   - Thêm hoạt động gì ở bước khởi động / hình thành kiến thức / luyện tập?
   - Bổ sung ví dụ kiểu gì cho phần học sinh đang yếu?
   - Điều chỉnh tốc độ / phân nhóm / dùng phiếu học tập như thế nào?
Trình bày ngắn gọn, dạng gạch đầu dòng, tiếng Việt, hướng tới giáo viên thực hành ngay.
    `.trim();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia sư phạm Toán THPT, viết ngắn gọn, thực tế, dễ áp dụng.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    const text =
      completion.choices[0]?.message?.content ||
      "Không nhận được gợi ý từ mô hình.";

    return NextResponse.json({ result: text });
  } catch (err: any) {
    console.error("AI reflect error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi server khi gọi AI." },
      { status: 500 }
    );
  }
}
