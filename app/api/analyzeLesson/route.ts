import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, model = "gpt-4o-mini" } = body || {};

    if (!content || String(content).trim().length < 30) {
      return NextResponse.json({ error: "NO_CONTENT" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Bạn là chuyên gia sư phạm THPT. Hãy phân tích giáo án dưới đây và trả lời đúng cấu trúc JSON.

YÊU CẦU:
- Ngôn ngữ: tiếng Việt, ngắn gọn, dễ hiểu.
- Trả về đúng JSON, không thêm giải thích.

CẤU TRÚC JSON:
{
  "summary": "Tóm tắt ngắn gọn nội dung chính của bài (1-2 câu).",
  "objectives": [
    "Mục tiêu 1 ở dạng học sinh có thể...",
    "Mục tiêu 2...",
    "..."
  ],
  "key_concepts": [
    "Khái niệm hoặc nội dung trọng tâm 1",
    "Khái niệm hoặc nội dung trọng tâm 2",
    "Khái niệm hoặc nội dung trọng tâm 3"
  ],
  "common_misconceptions": [
    "Lỗi hoặc hiểu lầm thường gặp 1",
    "Lỗi hoặc hiểu lầm thường gặp 2",
    "Lỗi hoặc hiểu lầm thường gặp 3"
  ]
}

DƯỚI ĐÂY LÀ GIÁO ÁN CẦN PHÂN TÍCH:
""" 
${content}
"""
`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Bạn là chuyên gia sư phạm THPT, chỉ trả lời JSON hợp lệ." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content ?? "{}");

    return NextResponse.json({ result: analysis });
  } catch (err) {
    console.error("analyzeLesson error", err);
    return NextResponse.json(
      { error: "ANALYZE_FAILED" },
      { status: 500 }
    );
  }
}
