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
    // Lấy thêm standards (Chuẩn)
    const { content, model = "gpt-4o-mini", apiKey, standards } = body || {};

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // --- LOGIC KÉP: CÓ CHUẨN VS KHÔNG CÓ CHUẨN ---
    let systemPrompt = "";

    if (standards && standards.trim().length > 10) {
        // MODE 1: PRECISION (BÁM CHUẨN)
        console.log("🔥 Chạy Mode Bám chuẩn");
        systemPrompt = `
          Bạn là Chuyên gia Kiểm định Chất lượng Giáo dục.
          
          NHIỆM VỤ:
          1. Đọc "Yêu cầu cần đạt" (Chuẩn) dưới đây.
          2. Đối chiếu với nội dung bài dạy xem giáo viên đã dạy phần nào.
          3. Tạo ra danh sách các nội dung kiến thức cốt lõi (ở Câu 3) BÁM SÁT VÀO CHUẨN này để kiểm tra xem học sinh có đạt chuẩn không.
          
          YÊU CẦU CẦN ĐẠT: "${standards}"

          YÊU CẦU ĐẦU RA (JSON):
          - "lesson_title": Tên bài.
          - "dynamic_knowledge_gaps": Liệt kê 4-5 tiêu chí đánh giá năng lực dựa trên Chuẩn (VD: "Kỹ năng giải...", "Vận dụng...").
        `;
    } else {
        // MODE 2: AUTO PILOT (TỰ DO)
        console.log("🚀 Chạy Mode Tự do");
        systemPrompt = `
          Bạn là Chuyên gia Sư phạm.
          Nhiệm vụ: Phân tích giáo án để tìm ra 4-5 khái niệm hoặc kỹ năng KHÓ NHẤT (Pain points) mà học sinh thường gặp khó khăn.
          
          YÊU CẦU ĐẦU RA (JSON):
          - "lesson_title": Tên bài.
          - "dynamic_knowledge_gaps": Danh sách 4-5 nội dung khó nhất (Ngắn gọn < 10 từ).
        `;
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Nội dung bài dạy:\n${content.substring(0, 15000)}` }
      ],
     
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // CẤU TRÚC PHIẾU (Giữ nguyên format 6 câu chuẩn)
    const survey_v2 = {
      type: "edumirror_standard_v2",
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        {
          id: "q1_feeling",
          type: "single_choice",
          text: "1. Cảm nhận chung của em về tiết học hôm nay?",
          options: ["A1 – Hứng thú 🤩", "A2 – Bình thường 🙂", "A3 – Hơi căng (bài khó/nhanh) 🤯", "A4 – Mệt, khó tập trung 😴"]
        },
        {
          id: "q2_understanding",
          type: "single_choice",
          text: "2. Em tự đánh giá mức độ hiểu bài của mình?",
          options: ["B1 – Chưa hiểu (Mất gốc)", "B2 – Mơ hồ (Cần xem lại)", "B3 – Hiểu cơ bản", "B4 – Hiểu rõ, tự tin làm bài"]
        },
        {
          id: "q3_difficulties",
          type: "multi_choice",
          text: "3. Phần làm em gặp khó khăn? (Có thể chọn nhiều)",
          options: [
            ...(aiData.dynamic_knowledge_gaps || []),
            "✅ Em nắm chắc kiến thức này",
            "⚡ Giảng hơi nhanh", "✍️ Không kịp ghi chép", "🔊 Lớp ồn / Khó tập trung", "🙋 Ngại hỏi khi không hiểu"
          ]
        },
        {
          id: "q4_teacher_adjust",
          type: "multi_choice",
          text: "4. Em muốn thầy/cô điều chỉnh gì để dễ hiểu hơn?",
          options: ["🐢 Giảng chậm hơn", "💡 Thêm ví dụ minh họa/thực tế", "📝 Cô đọng kiến thức trọng tâm cho ngắn gọn", "👥 Cho thảo luận nhóm nhiều hơn", "🗣️ Nói to - rõ - dễ nghe hơn", "🚩 Kiểm tra nhanh sau từng phần (Checkpoint)"]
        },
        {
          id: "q5_learning_style",
          type: "multi_choice",
          text: "5. Cách học nào giúp em tiếp thu tốt nhất?",
          options: ["🎧 Nghe giảng & Ghi chép", "📝 Làm bài tập ngay tại lớp", "🌍 Nghe ví dụ thực tế/kể chuyện", "🖼️ Xem sơ đồ/hình ảnh minh họa", "🗣️ Thảo luận/Trao đổi với bạn", "📖 Tự đọc tài liệu có hướng dẫn"]
        },
        {
          id: "q6_feedback_text",
          type: "text",
          text: "6. Lời nhắn ẩn danh cho thầy/cô:",
          placeholder: "Có điều gì em chưa hiểu, còn băn khoăn, hay mong muốn tiết sau? Hãy chia sẻ nhé (Thầy cô sẽ không biết tên em)."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}