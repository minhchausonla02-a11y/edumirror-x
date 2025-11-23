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

    // PROMPT MỚI: Chỉ yêu cầu AI tìm tên bài và 4 nội dung kiến thức cốt lõi
    const systemPrompt = `
      Bạn là chuyên gia sư phạm. Nhiệm vụ: Phân tích giáo án để tìm ra Cốt lõi bài học.
      Đầu vào: Nội dung bài dạy.
      Yêu cầu đầu ra (JSON):
      1. "lesson_title": Tên bài học ngắn gọn.
      2. "core_contents": Liệt kê đúng 4 nội dung kiến thức/kỹ năng trọng tâm nhất của bài này (Ngắn gọn, dưới 10 từ/ý).
    `;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Bài học:\n${content.substring(0, 15000)}` }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // --- XÂY DỰNG CẤU TRÚC PHIẾU 6 CÂU CHUẨN ---
    const survey_v2 = {
      type: "edumirror_standard_v2",
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        // 1. Cảm nhận (Single Choice)
        {
          id: "q1_feeling",
          type: "single_choice",
          text: "1. Cảm nhận chung của em về tiết học hôm nay?",
          options: [
            "A1 – Hứng thú 🤩",
            "A2 – Bình thường 🙂",
            "A3 – Hơi căng (bài khó/nhanh) 🤯",
            "A4 – Mệt, khó tập trung 😴"
          ]
        },
        // 2. Mức độ hiểu (Single Choice)
        {
          id: "q2_understanding",
          type: "single_choice",
          text: "2. Em tự đánh giá mức độ hiểu bài của mình?",
          options: [
            "B1 – Chưa hiểu (Mất gốc)",
            "B2 – Mơ hồ (Cần xem lại)",
            "B3 – Hiểu cơ bản",
            "B4 – Hiểu rõ, tự tin làm bài"
          ]
        },
        // 3. Khó khăn (Multi Choice - Kết hợp AI & Cố định)
        {
          id: "q3_difficulties",
          type: "multi_choice",
          text: "3. Phần làm em gặp khó khăn? (Có thể chọn nhiều)",
          options: [
            // Nhóm A: Kiến thức (AI sinh)
            ...(aiData.core_contents || ["Nội dung 1", "Nội dung 2", "Nội dung 3", "Nội dung 4"]),
            "✅ Em nắm chắc kiến thức này",
            // Nhóm B: Phương pháp (Cố định)
            "⚡ Giảng hơi nhanh",
            "✍️ Không kịp ghi chép",
            "🔊 Lớp ồn / Khó tập trung",
            "🙋 Ngại hỏi khi không hiểu"
          ]
        },
        // 4. Điều chỉnh (Multi Choice)
        {
          id: "q4_teacher_adjust",
          type: "multi_choice",
          text: "4. Em muốn thầy/cô điều chỉnh gì để dễ hiểu hơn?",
          options: [
            "🐢 Giảng chậm hơn",
            "💡 Thêm ví dụ minh họa/thực tế",
            "🗺️ Sơ đồ hóa kiến thức (Mindmap)",
            "👥 Cho thảo luận nhóm nhiều hơn",
            "🗣️ Nói to - rõ - dễ nghe hơn",
            "🚩 Kiểm tra nhanh sau từng phần (Checkpoint)"
          ]
        },
        // 5. Phong cách học (Multi Choice) - MỚI
        {
          id: "q5_learning_style",
          type: "multi_choice",
          text: "5. Cách học nào giúp em tiếp thu tốt nhất?",
          options: [
            "🎧 Nghe giảng & Ghi chép",
            "📝 Làm bài tập ngay tại lớp",
            "🌍 Nghe ví dụ thực tế/kể chuyện",
            "🖼️ Xem sơ đồ/hình ảnh minh họa",
            "🗣️ Thảo luận/Trao đổi với bạn",
            "📖 Tự đọc tài liệu có hướng dẫn"
          ]
        },
        // 6. Lời nhắn (Text)
        {
          id: "q6_feedback_text",
          type: "text",
          text: "6. Lời nhắn ẩn danh cho thầy/cô:",
          placeholder: "Có điều gì em chưa hiểu, còn băn khoăn, hay mong muốn tiết sau? Hãy chia sẻ nhé (Các em cứ góp ý thật lòng, phiếu ẩn danh, thầy/cô chỉ dùng để dạy tốt hơn, không để phê bình ai cả.)."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}