// File: app/api/generate-survey/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hàm lọc JSON sạch
function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

// QUAN TRỌNG: Phải là export async function POST
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, model = "gpt-4o-mini", apiKey } = body || {};

    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = apiKey || headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    const systemPrompt = `
      Bạn là chuyên gia EduMirror. Trích xuất dữ liệu bài học để tạo phiếu khảo sát.
      Trả về JSON (không markdown):
      {
        "lesson_title": "Tên bài học (Tiếng Việt)",
        "dynamic_knowledge_gaps": ["Khái niệm khó 1", "Khái niệm khó 2", "Khái niệm khó 3"]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bài học: ${content.substring(0, 12000)}` }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // Cấu trúc phiếu 5 câu chuẩn
    const survey_v2 = {
      type: "smart_5_questions",
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        {
          id: "q1_sentiment",
          type: "sentiment",
          text: "Tiết học hôm nay để lại cho em cảm giác gì?",
          options: ["🤩 Hứng thú|Hiểu bài", "🙂 Bình thường|Ổn", "🤯 Hơi căng|Khó", "😴 Mệt mỏi|Chán"]
        },
        {
          id: "q2_understanding",
          type: "rating",
          text: "Em đánh giá mức độ hiểu bài của mình?",
          options: ["Mức 1: Chưa hiểu", "Mức 2: Mơ hồ", "Mức 3: Hiểu tương đối", "Mức 4: Hiểu rõ"]
        },
        {
          id: "q3_gaps",
          type: "checkbox_dynamic",
          text: "Phần nào làm khó em nhất?",
          options: [...(aiData.dynamic_knowledge_gaps || []), "Không có, em nắm chắc rồi"]
        },
        {
          id: "q4_wishes",
          type: "checkbox_static",
          text: "Tiết sau thầy/cô nên ưu tiên điều gì?",
          options: ["🐢 Giảng chậm lại", "💡 Thêm ví dụ", "👥 Thảo luận nhóm", "🗺️ Sơ đồ hóa"]
        },
        {
          id: "q5_feedback",
          type: "text",
          text: "Lời nhắn gửi bí mật:",
          placeholder: "Nhập lời nhắn..."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}