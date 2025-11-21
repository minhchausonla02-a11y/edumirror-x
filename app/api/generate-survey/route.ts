import OpenAI from "openai";
import { NextResponse } from "next/server";

// Cấu hình Next.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Hàm helper để parse JSON an toàn từ output của AI
function safeParse(text: string) {
  try {
    // Cố gắng parse trực tiếp
    return JSON.parse(text);
  } catch (e) {
    // Nếu AI trả về markdown (```json ... ```), ta lọc bỏ nó
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      content,          // Nội dung bài giáo án
      model = "gpt-4o-mini",
      apiKey            // Key truyền từ Client (nếu có)
    } = body || {};

    // 1. Validate đầu vào
    if (!content || String(content).trim().length < 50) {
      return NextResponse.json({ error: "Nội dung giáo án quá ngắn" }, { status: 400 });
    }

    // 2. Lấy API Key (Ưu tiên từ Header -> Body -> Env)
    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = apiKey || headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) {
      return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });
    }

    const openai = new OpenAI({ apiKey: finalKey });

    // 3. Prompt: Yêu cầu AI trích xuất dữ liệu ĐỘNG (Dynamic Data)
    const systemPrompt = `
      Bạn là chuyên gia sư phạm EduMirror. Nhiệm vụ: Phân tích giáo án và trích xuất dữ liệu để tạo phiếu khảo sát.
      
      Đầu vào là nội dung bài dạy. Hãy trả về kết quả dưới dạng JSON (không markdown) với cấu trúc sau:
      {
        "lesson_title": "Tên bài học ngắn gọn (Tiếng Việt)",
        "dynamic_knowledge_gaps": [
          "Trọng tâm kiến thức 1 (Ngắn gọn < 10 từ)",
          "Trọng tâm kiến thức 2",
          "Trọng tâm kiến thức 3"
        ],
        "check_question": {
          "question": "Một câu hỏi trắc nghiệm kiểm tra nhanh mức độ thông hiểu (10 giây)",
          "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          "correct_answer": "Nội dung của đáp án đúng (Ví dụ: Đáp án A)"
        }
      }
    `;

    // 4. Gọi OpenAI
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Nội dung bài học:\n${content.substring(0, 15000)}` } // Giới hạn token input
      ],
      temperature: 0.5, // Giữ độ sáng tạo vừa phải để trích xuất chính xác
      response_format: { type: "json_object" } // Bắt buộc trả về JSON (Feature mới của GPT)
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const aiData = safeParse(rawContent);

    // 5. Lắp ráp dữ liệu AI vào Khung Phiếu 5 Câu Chuẩn
    // (Cấu trúc này khớp hoàn toàn với SurveyView.tsx ở Frontend)
    const survey_v2 = {
      type: "smart_5_questions", // Định danh loại phiếu mới
      title: aiData.lesson_title || "Phản hồi sau tiết học",
      questions: [
        // CÂU 1: CẢM XÚC (Sentiment)
        {
          id: "q1_sentiment",
          type: "sentiment",
          text: "Cảm xúc chủ đạo của em sau tiết học này là gì?",
          options: ["Hào hứng 🤩", "Bình thường 🙂", "Lo lắng 😟", "Mệt mỏi 😴"]
        },
        // CÂU 2: MỨC ĐỘ HIỂU (Rating)
        {
          id: "q2_understanding",
          type: "rating",
          text: "Em đánh giá mức độ hiểu bài của mình?",
          options: [
            "Mức 1: Mất gốc / Chưa hiểu",
            "Mức 2: Mơ hồ / Cần xem lại",
            "Mức 3: Hiểu tương đối",
            "Mức 4: Hiểu rõ / Tự tin"
          ]
        },
        // CÂU 3: KIẾN THỨC ĐỘNG (Checkbox Dynamic) -> QUAN TRỌNG NHẤT
        {
          id: "q3_gaps",
          type: "checkbox_dynamic",
          text: "Phần kiến thức nào làm khó em nhất? (Chọn nhiều)",
          // AI điền nội dung vào đây:
          options: [
            ...(aiData.dynamic_knowledge_gaps || ["Nội dung 1", "Nội dung 2", "Nội dung 3"]),
            "Không có, em nắm chắc rồi"
          ]
        },
        // CÂU 4: QUIZ CHECK NHANH (Quiz) -> QUAN TRỌNG NHÌ
        {
          id: "q4_check",
          type: "quiz",
          text: "Thử thách 10 giây: " + (aiData.check_question?.question || "Câu hỏi kiểm tra"),
          quiz_data: aiData.check_question || { options: ["A", "B", "C", "D"] }
        },
        // CÂU 5: FEEDBACK (Text)
        {
          id: "q5_feedback",
          type: "text",
          text: "Lời nhắn gửi đến thầy/cô (Mong muốn thay đổi hoặc chỗ chưa hiểu):",
          placeholder: "VD: Thầy giảng lại phần X, Em muốn thêm ví dụ..."
        }
      ]
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi sinh câu hỏi" },
      { status: 500 }
    );
  }
}