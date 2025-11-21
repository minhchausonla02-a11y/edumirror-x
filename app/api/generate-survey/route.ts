import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hàm lọc JSON sạch từ phản hồi của AI
function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, model = "gpt-4o-mini", apiKey } = body || {};

    // Lấy API Key (Ưu tiên header > body > env)
    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = apiKey || headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // Prompt: Chỉ yêu cầu AI trích xuất 3 "Lỗ hổng kiến thức"
    const systemPrompt = `
      Bạn là chuyên gia EduMirror. Nhiệm vụ: Trích xuất dữ liệu bài học để tạo phiếu khảo sát.
      Đầu vào: Nội dung bài dạy.
      Trả về JSON (không markdown):
      {
        "lesson_title": "Tên bài học ngắn gọn (Tiếng Việt)",
        "dynamic_knowledge_gaps": [
          "Khái niệm/Kỹ năng khó 1 (< 10 từ)",
          "Khái niệm/Kỹ năng khó 2 (< 10 từ)",
          "Khái niệm/Kỹ năng khó 3 (< 10 từ)"
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bài học:\n${content.substring(0, 12000)}` }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // CẤU TRÚC PHIẾU 5 CÂU CHUẨN (Đã khớp với giao diện Gen Z)
    const survey_v2 = {
      type: "smart_5_questions",
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        // CÂU 1: CẢM XÚC (Sentiment)
        {
          id: "q1_sentiment",
          type: "sentiment",
          text: "Tiết học hôm nay để lại cho em cảm giác gì?",
          options: [
            "🤩 Hứng thú|Hiểu bài, thấy thời gian trôi nhanh", 
            "🙂 Bình thường|Nắm được ý chính, không quá áp lực", 
            "🤯 Hơi căng|Bài khó hoặc tốc độ hơi nhanh", 
            "😴 Mệt mỏi|Khó tập trung hoặc mất hứng thú"
          ]
        },
        // CÂU 2: HIỂU BÀI (Rating)
        {
          id: "q2_understanding",
          type: "rating",
          text: "Em đánh giá mức độ hiểu bài của mình?",
          options: [
            "Mức 1: Mất gốc / Chưa hiểu gì",
            "Mức 2: Mơ hồ / Cần xem lại",
            "Mức 3: Hiểu tương đối / Làm được bài cơ bản",
            "Mức 4: Hiểu rõ / Tự tin cân mọi bài"
          ]
        },
        // CÂU 3: KIẾN THỨC ĐỘNG (AI điền vào đây)
        {
          id: "q3_gaps",
          type: "checkbox_dynamic",
          text: "Phần nào làm khó em nhất? (Chọn nhiều)",
          options: [
            ...(aiData.dynamic_knowledge_gaps || ["Nội dung 1", "Nội dung 2", "Nội dung 3"]),
            "Không có, em nắm chắc rồi"
          ]
        },
        // CÂU 4: MONG MUỐN (Cố định sư phạm)
        {
          id: "q4_wishes",
          type: "checkbox_static",
          text: "Tiết sau thầy/cô nên ưu tiên điều gì?",
          options: [
            "🐢 Giảng chậm lại một chút",
            "💡 Thêm nhiều ví dụ thực tế hơn",
            "👥 Cho thảo luận nhóm nhiều hơn",
            "🗺️ Sơ đồ hóa kiến thức cho dễ nhớ"
          ]
        },
        // CÂU 5: LỜI NHẮN (Text)
        {
          id: "q5_feedback",
          type: "text",
          text: "Lời nhắn gửi bí mật đến thầy/cô:",
          placeholder: "Gợi ý: Em hay nhầm chỗ nào? Muốn thầy giảng lại đoạn nào? Hay đơn giản là một lời khen..."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}