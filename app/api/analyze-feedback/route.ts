import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feedbacks, apiKey } = body;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({ result: [] });
    }

    const openai = new OpenAI({ apiKey: finalKey });

    // PROMPT: Yêu cầu AI trả về JSON array
    const prompt = `
      Bạn là chuyên gia phân tích dữ liệu giáo dục.
      
      NHIỆM VỤ:
      1. Đọc các phản hồi của học sinh (bao gồm tiếng lóng Gen Z: "khum", "cuốn", "lag"...).
      2. Dịch sang tiếng Việt chuẩn.
      3. GOM NHÓM các ý kiến có cùng nội dung lại với nhau.
      4. Đếm số lượng phiếu trong mỗi nhóm.

      DANH SÁCH PHẢN HỒI:
      ${JSON.stringify(feedbacks)}

      YÊU CẦU ĐẦU RA (JSON Array thuần túy):
      [
        {
          "category": "Tên nhóm vấn đề (Ngắn gọn)",
          "summary": "Mô tả chi tiết vấn đề (Đã chuẩn hóa)",
          "count": Số lượng phiếu,
          "type": "negative" | "positive" | "neutral" | "question",
          "original_sample": "Trích dẫn 1 câu gốc điển hình nhất"
        }
      ]
      Sắp xếp theo số lượng giảm dần.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    let content = response.choices[0].message.content || "[]";
    // Làm sạch JSON (đề phòng AI trả về markdown)
    content = content.replace(/```json|```/g, "").trim();
    
    return NextResponse.json({ result: JSON.parse(content) });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}