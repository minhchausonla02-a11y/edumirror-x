import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stats, lessonPlan } = body ?? {};

    const apiKeyFromHeader = req.headers.get("x-openai-key");
    const apiKey = apiKeyFromHeader || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu API Key cho OpenAI." },
        { status: 400 }
      );
    }

    if (!stats) {
      return NextResponse.json(
        { error: "Thiếu số liệu thống kê (stats)." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });

    const { understood, notClear, tooFast, needExamples, total } = stats;

    const prompt = `
Bạn là một chuyên gia sư phạm Toán THPT, đang hỗ trợ giáo viên ở trường miền núi lớp đông, học sinh còn rụt rè.

Dưới đây là số liệu ẩn danh từ Phiếu 60 giây sau một tiết học:
- Tổng số phiếu: ${total}
- Hiểu bài: ${understood}
- Chưa rõ nội dung: ${notClear}
- Tiết dạy hơi nhanh: ${tooFast}
- Cần thêm ví dụ: ${needExamples}

Giáo án (tóm tắt / nội dung chính) nếu có:
${lessonPlan || "(chưa cung cấp cụ thể, hãy tư vấn ở mức tổng quát cho tiết Toán THPT)."}

Hãy phân tích và trả lời theo cấu trúc ngắn gọn, rõ ràng, dành cho giáo viên bận rộn:

1) Chẩn đoán lớp:
   - Nhận xét chung về mức độ hiểu bài, tốc độ dạy, nhu cầu ví dụ minh hoạ.
   - Nếu số phiếu ít, hãy nhắc giáo viên coi đây là tín hiệu tham khảo.

2) 3–5 đề xuất điều chỉnh cho TIẾT HỌC SAU:
   - Gợi ý rất cụ thể: ví dụ "dành thêm X phút cho việc nhắc lại định nghĩa", "thêm 1 ví dụ gần gũi với đời sống HS vùng miền núi", "cho HS làm việc theo cặp để hỏi riêng", v.v.
   - Nhấn mạnh cách giúp HS yếu, ngại phát biểu vẫn có cơ hội hiểu.

3) Gợi ý 1–2 câu hỏi gợi mở để mở đầu hoặc kết thúc tiết sau (dạng câu hỏi cho cả lớp hoặc theo nhóm).

Trả lời bằng tiếng Việt, dạng gạch đầu dòng, ngắn gọn, dễ đọc.
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý sư phạm hỗ trợ giáo viên THPT điều chỉnh bài dạy dựa trên phản hồi ẩn danh của học sinh.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const text =
      completion.choices[0]?.message?.content?.toString() ||
      "Không nhận được nội dung từ AI.";

    return NextResponse.json({ result: text });
  } catch (err: any) {
    console.error("AI Reflect error:", err);
    return NextResponse.json(
      { error: "Không gọi được AI phân tích." },
      { status: 500 }
    );
  }
}
