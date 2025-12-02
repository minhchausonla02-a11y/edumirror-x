import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Lấy model từ body (Mặc định gpt-4o-mini)
    const { feedbacks, apiKey, model = "gpt-4o-mini" } = body;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({ result: [] });
    }

    const openai = new OpenAI({ apiKey: finalKey });

// --- PROMPT MỚI: SIÊU BỘ LỌC SƯ PHẠM ---
    const prompt = `
      Bạn là Chuyên gia Kiểm định Chất lượng Giáo dục.
      Nhiệm vụ: Lọc và Phân tích phản hồi của học sinh.
      
      QUY TẮC LỌC (Rất quan trọng):
      Chỉ giữ lại các phản hồi thuộc 3 nhóm sau:
      1. **Kiến thức:** (VD: "Chưa hiểu bài", "Khó quá", "Giảng lại phần X").
      2. **Phương pháp:** (VD: "Giảng nhanh", "Cần ví dụ", "Ồn ào").
      3. **Cảm xúc học tập:** (VD: "Hứng thú", "Chán", "Buồn ngủ").
      
      LOẠI BỎ NGAY LẬP TỨC (Không đưa vào báo cáo):
      - Spam, vô nghĩa ("hdhd", "...", "123").
      - Tên riêng không rõ ngữ cảnh ("Thìn Lò", "Tuấn Anh").
      - Nhận xét ngoại hình/đời tư ("Thầy đẹp trai", "Cô xinh").
      - Lời chào xã giao ("Em chào thầy", "Hi").

      SAU KHI LỌC:
      - Dịch tiếng lóng Gen Z sang tiếng Việt chuẩn.
      - Gom nhóm các ý kiến trùng lặp.
      - Đếm số lượng.

      DANH SÁCH INPUT:
      ${JSON.stringify(feedbacks)}

      YÊU CẦU OUTPUT (JSON Array thuần túy):
      [
        {
          "category": "Tên nhóm vấn đề",
          "summary": "Mô tả nội dung (Đã chuẩn hóa)",
          "count": Số lượng,
          "type": "negative" | "positive" | "neutral" | "question",
          "original_sample": "Trích dẫn 1 câu gốc (đã được lọc)"
        }
      ]
    `;

    // Gọi OpenAI (Đã bỏ temperature để tương thích tốt với mọi model kể cả o1)
    const response = await openai.chat.completions.create({
      model: model, 
      messages: [{ role: "user", content: prompt }],
      // Không để temperature ở đây để tránh lỗi với model o1
    });

    let content = response.choices[0].message.content || "[]";
    // Làm sạch JSON phòng trường hợp AI trả về markdown
    content = content.replace(/```json|```/g, "").trim();
    
    return NextResponse.json({ result: JSON.parse(content) });

  } catch (error: any) {
    console.error("Analyze Feedback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}