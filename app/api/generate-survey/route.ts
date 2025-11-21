import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = apiKey || headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // --- PROMPT MỚI: YÊU CẦU 5-7 Ý ---
    const systemPrompt = `
      Bạn là chuyên gia sư phạm EduMirror. Nhiệm vụ: Phân tích giáo án để tìm ra các "Điểm nóng kiến thức" (Pain points).
      
      Đầu vào: Nội dung bài dạy.
      Yêu cầu đầu ra (JSON):
      1. "lesson_title": Tên bài học ngắn gọn.
      2. "dynamic_knowledge_gaps": Hãy liệt kê từ 5 đến 7 khái niệm, kỹ năng hoặc dạng bài cụ thể mà học sinh thường gặp khó khăn trong bài này.
         - Mỗi ý phải ngắn gọn (dưới 12 từ).
         - Bắt đầu bằng động từ hoặc danh từ (Ví dụ: "Vẽ đồ thị...", "Phân biệt...", "Công thức...").
         - Sắp xếp theo trình tự bài học.
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bài học:\n${content.substring(0, 15000)}` }
      ],
      temperature: 0.6, // Tăng nhẹ độ sáng tạo để tìm đủ 7 ý
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // CẤU TRÚC PHIẾU 5 CÂU (Đã cập nhật text chuẩn)
    const survey_v2 = {
      type: "smart_5_questions",
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        {
          id: "q1_sentiment",
          type: "sentiment",
          text: "Em cảm thấy tiết học hôm nay thế nào?",
          options: [
            "🤩 Hứng thú|Em hiểu bài và thấy rất vui", 
            "🙂 Bình thường|Em nắm được bài, mọi thứ ổn", 
            "🤯 Hơi căng|Bài hơi khó hoặc giảng hơi nhanh", 
            "😴 Mệt mỏi|Em khó tập trung hoặc buồn ngủ"
          ]
        },
        {
          id: "q2_understanding",
          type: "rating",
          text: "Em tự đánh giá mức độ hiểu bài của mình?",
          options: [
            "Mức 1: Em chưa hiểu (Mất gốc)",
            "Mức 2: Em còn mơ hồ (Cần xem lại)",
            "Mức 3: Em hiểu sương sương (Làm được bài cơ bản)",
            "Mức 4: Em hiểu rất rõ (Tự tin làm bài)"
          ]
        },
        // CÂU 3: SẼ HIỆN 5-7 LỰA CHỌN TỪ AI
        {
          id: "q3_gaps",
          type: "checkbox_dynamic",
          text: "Phần nào làm khó em nhất? (Có thể chọn nhiều)",
          options: [
            ...(aiData.dynamic_knowledge_gaps || []),
            "Không có, em nắm chắc rồi"
          ]
        },
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
        {
          id: "q5_feedback",
          type: "text",
          text: "Lời nhắn gửi bí mật:",
          placeholder: "Gợi ý: Em muốn thầy giảng lại đoạn nào? Cần thêm ví dụ gì?..."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}