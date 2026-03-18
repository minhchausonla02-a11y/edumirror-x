// File: app/api/analyze-feedback/route.ts
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Hàm parse JSON an toàn (Dùng chung cho cả 2 AI)
function safeParse(text: string) {
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIndex = cleanText.indexOf('[');
    const endIndex = cleanText.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1) {
      return JSON.parse(cleanText.substring(startIndex, endIndex + 1));
    }
    return [];
  } catch (e) {
    console.error("Lỗi trích xuất JSON:", e);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { feedbacks, apiKey, geminiKey, model = "gpt-5.4" } = body;

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({ result: [] });
    }

    const prompt = `
      Bạn là Trợ lý Thư ký Hội đồng Giáo dục (EduMirror AI).
      
      NHIỆM VỤ:
      Tổng hợp các phản hồi ẩn danh của học sinh sau tiết học thành một báo cáo ngắn gọn, súc tích cho giáo viên.

      1. QUY TẮC LỌC (FILTERING):
         - LOẠI BỎ NGAY: Các câu vô nghĩa ("...", "asdf"), Spam ("Thìn Lò", "Phong xướng"), Nhận xét ngoại hình không liên quan ("Thầy đẹp trai"), hoặc lời chào xã giao.
         - GIỮ LẠI: Các ý kiến về Kiến thức, Phương pháp dạy, Tốc độ, Cảm xúc học tập.

      2. XỬ LÝ NGÔN NGỮ:
         - "Dịch" tiếng lóng Gen Z (vd: "khum", "cuốn", "lag", "xỉu") sang tiếng Việt phổ thông, chuẩn mực.
         - Gom nhóm các ý kiến trùng lặp.
         - Viết lại nội dung tóm tắt bằng ngôn ngữ sư phạm, nhẹ nhàng.

      DANH SÁCH PHẢN HỒI GỐC:
      ${JSON.stringify(feedbacks)}

      YÊU CẦU ĐẦU RA (JSON Array thuần túy, KHÔNG markdown, KHÔNG giải thích):
      [
        {
          "category": "Nhãn ngắn gọn (VD: 'Kiến thức', 'Phương pháp', 'Lời khen', 'Góp ý')",
          "summary": "Nội dung tóm tắt (Viết một câu hoàn chỉnh. VD: 'Học sinh thấy bài giảng hơi nhanh, chưa chép kịp.')",
          "count": Số lượng phiếu,
          "type": "negative" | "positive" | "neutral",
          "original_sample": "Trích dẫn nguyên văn 1 câu gốc để làm bằng chứng"
        }
      ]
      
      Sắp xếp theo số lượng giảm dần. Nếu lọc xong không còn gì thì trả về [].
    `;

    let aiResultData;

    // =========================================================
    // NGÃ RẼ 1: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN GEMINI
    // =========================================================
    if (model.startsWith("gemini")) {
      const rawGeminiKey = geminiKey || process.env.GOOGLE_GEMINI_API_KEY || "";
      const finalGeminiKey = rawGeminiKey.trim();

      if (!finalGeminiKey) return NextResponse.json({ error: "Thiếu Google Gemini API Key" }, { status: 401 });

      // 🚀 CHIỀU LÒNG GOOGLE: Ép sang dùng bản 2.5 mới nhất!
      let realGeminiModel = "gemini-2.5-flash"; 
      if (model.includes("pro")) {
          realGeminiModel = "gemini-2.5-pro";
      }

      const genAI = new GoogleGenerativeAI(finalGeminiKey);
      const geminiModel = genAI.getGenerativeModel({ model: realGeminiModel });

      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text();
      
      aiResultData = safeParse(responseText);
    } 
    // =========================================================
    // NGÃ RẼ 2: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN OPENAI
    // =========================================================
    else {
      const finalKey = apiKey || process.env.OPENAI_API_KEY;
      if (!finalKey) return NextResponse.json({ error: "Thiếu OpenAI API Key" }, { status: 401 });

      const openai = new OpenAI({ apiKey: finalKey });

      let realOpenAIModel = model; 
      if (model === "gpt-4.5") {
        realOpenAIModel = "gpt-4o"; 
      }

      const response = await openai.chat.completions.create({
        model: realOpenAIModel,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0].message.content || "[]";
      aiResultData = safeParse(content);
    }

    return NextResponse.json({ result: aiResultData });

  } catch (error: any) {
    console.error("Analyze Feedback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}