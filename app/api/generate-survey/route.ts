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
    // [THÊM MỚI] Nhận thêm biến processMode từ giao diện
    const { content, model = "gpt-4o-mini", apiKey, standards, processMode } = body || {};

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    let systemPrompt = "";

    // LUỒNG 1: CAO CẤP (Soi kỹ công thức Toán/Lý/Hóa bằng LaTeX)
    if (processMode === "premium") {
      console.log("💎 Chạy Mode CAO CẤP: Phân tích sâu công thức");
      systemPrompt = `
        Bạn là một Chuyên gia Sư phạm xuất sắc môn Toán/Lý/Hóa.
        Nhiệm vụ của bạn là đọc nội dung giáo án có chứa các công thức Toán học (được viết bằng LaTeX bọc trong $, $$ hoặc \\[, \\]).
        
        Thay vì đưa ra các khó khăn chung chung, hãy TÌM RA 4-5 LỖI SAI KINH ĐIỂN, SỰ NHẦM LẪN HOẶC ĐIỂM MÙ TƯ DUY (Pain points) MÀ HỌC SINH THƯỜNG MẮC PHẢI KHI ÁP DỤNG CÁC CÔNG THỨC NÀY.
        Biến các lỗi sai đó thành các câu phát biểu của học sinh (ngắn gọn dưới 15 từ).
        Ví dụ: "Em hay quên đổi chiều bất phương trình", "Em nhầm lẫn khi xét dấu nhị thức", "Em không hiểu bước gộp nghiệm"...

        YÊU CẦU ĐẦU RA (JSON TUYỆT ĐỐI):
        {
          "lesson_title": "Tên bài học ngắn gọn",
          "dynamic_knowledge_gaps": ["Lỗi sai 1...", "Lỗi sai 2...", "Lỗi sai 3...", "Lỗi sai 4..."]
        }
      `;
    } 
    // LUỒNG 2: TỐC ĐỘ / CÓ CHUẨN (Phân tích văn bản thường)
    else {
      console.log("🚀 Chạy Mode TỐC ĐỘ / CƠ BẢN");
      systemPrompt = `
        Bạn là Chuyên gia Kiểm định Giáo dục.
        ${standards ? `YÊU CẦU CẦN ĐẠT: "${standards}"\nHãy bám sát chuẩn này.` : "Hãy phân tích nội dung giáo án."}
        Tìm ra 4-5 khái niệm hoặc kỹ năng KHÓ NHẤT mà học sinh thường gặp khó khăn.
        
        YÊU CẦU ĐẦU RA (JSON TUYỆT ĐỐI):
        {
          "lesson_title": "Tên bài học",
          "dynamic_knowledge_gaps": ["Khó khăn 1...", "Khó khăn 2...", "Khó khăn 3..."]
        }
      `;
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Nội dung bài dạy (chứa LaTeX):\n${content.substring(0, 15000)}` }
      ],
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // CẤU TRÚC PHIẾU GIỮ NGUYÊN (Chỉ thay đổi nội dung Câu 3 cho sắc bén hơn)
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
          text: "3. Trong bài này, em gặp khó khăn ở bước tư duy nào nhất? (Có thể chọn nhiều)",
          options: [
            ...(aiData.dynamic_knowledge_gaps || []),
            "✅ Em nắm chắc toàn bộ kiến thức, không bị vướng mắc",
            "⚡ Giảng hơi nhanh, em ghi không kịp", 
            "🔊 Lớp ồn / Khó tập trung"
          ]
        },
        {
          id: "q4_teacher_adjust",
          type: "multi_choice",
          text: "4. Em muốn thầy/cô điều chỉnh gì để dễ hiểu hơn?",
          options: ["🐢 Giảng chậm lại ở các bước biến đổi công thức", "💡 Thêm ví dụ minh họa từng bước giải", "📝 Cô đọng kiến thức trọng tâm", "🗣️ Nhắc lại kiến thức cũ trước khi áp dụng"]
        },
        {
          id: "q5_learning_style",
          type: "multi_choice",
          text: "5. Cách học nào giúp em tiếp thu bài Toán/Lý/Hóa tốt nhất?",
          options: ["📝 Thầy cô giải mẫu từng bước trên bảng", "✍️ Tự nháp bài ngay tại lớp và được sửa", "👥 Thảo luận cách giải với bạn cùng bàn", "📖 Có tài liệu tóm tắt công thức rõ ràng"]
        },
        {
          id: "q6_feedback_text",
          type: "text",
          text: "6. Lời nhắn ẩn danh cho thầy/cô:",
          placeholder: "Có công thức hay bước giải nào em chưa hiểu rõ? Hãy chia sẻ nhé (Ẩn danh hoàn toàn)."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}