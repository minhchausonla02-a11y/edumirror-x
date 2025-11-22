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

    // --- PROMPT MỚI: CHỈ LẤY 4-5 Ý KHÓ NHẤT ---
    const systemPrompt = `
      Bạn là chuyên gia sư phạm EduMirror. Nhiệm vụ: Phân tích giáo án để tìm ra các "Điểm nóng kiến thức" (Pain points).
      
      Đầu vào: Nội dung bài dạy.
      Yêu cầu đầu ra (JSON):
      1. "lesson_title": Tên bài học ngắn gọn.
      2. "dynamic_knowledge_gaps": Hãy chọn lọc và liệt kê từ 4 đến 5 khái niệm/kỹ năng KHÓ NHẤT mà học sinh thường sai hoặc không hiểu.
         - Số lượng bắt buộc: Tối thiểu 4, Tối đa 5 ý. (Không được nhiều hơn).
         - Tiêu chí chọn: Chọn những phần trừu tượng, dễ nhầm lẫn hoặc trọng tâm của bài.
         - Văn phong: Ngắn gọn (dưới 10 từ/ý), bắt đầu bằng động từ hoặc danh từ.
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bài học:\n${content.substring(0, 15000)}` }
      ],
      temperature: 0.5, // Giảm độ sáng tạo để AI tuân thủ chặt chẽ số lượng
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // CẤU TRÚC PHIẾU 5 CÂU
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
        // CÂU 3: SẼ HIỆN 4-5 LỰA CHỌN KHÓ NHẤT + 1 LỰA CHỌN "KHÔNG CÓ"
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