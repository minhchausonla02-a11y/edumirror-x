// app/api/ai-reflect/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { stats, lessonPlan, apiKey, model } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "Thiếu API key từ client." },
        { status: 400 }
      );
    }

    if (!stats) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu thống kê 60s." },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    const modelName = model || "gpt-4o-mini";

    const prompt = `
Anh/chị là một giáo viên giàu kinh nghiệm dạy Toán THPT.

1) Dữ liệu Phiếu 60s (tổng số HS: ${stats.total}):
- Hiểu bài: ${stats.understood}
- Chưa rõ nội dung: ${stats.notClear}
- Tiết dạy hơi nhanh: ${stats.tooFast}
- Cần thêm ví dụ: ${stats.needExamples}

2) Trích đoạn giáo án (nếu có):
${lessonPlan?.slice(0, 3000) || "(không có)"}

Hãy:
- Nhận xét ngắn gọn về mức độ hiểu bài và tốc độ tiết dạy.
- Đề xuất 3–5 điều chỉnh cụ thể cho tiết sau (cách giảng, ví dụ, hoạt động nhóm, bài tập về nhà...).
- Viết gọn, rõ ràng, đánh số từng ý.
`;

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const text =
      completion.choices[0]?.message?.content?.trim() ||
      "Không nhận được gợi ý từ AI.";

    return NextResponse.json({ result: text });
  } catch (err: any) {
    console.error("ai-reflect error", err);
    return NextResponse.json(
      { error: err?.message || "Lỗi khi gọi AI." },
      { status: 500 }
    );
  }
}
