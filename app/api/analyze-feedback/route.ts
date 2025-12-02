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

    // --- PROMPT MẠNH: LỌC RÁC + DỊCH GEN Z + GOM NHÓM ---
    const prompt = `
      Bạn là chuyên gia phân tích dữ liệu giáo dục.
      
      NHIỆM VỤ CỦA BẠN GỒM 2 BƯỚC:

      BƯỚC 1: LỌC DỮ LIỆU (FILTERING)
      - Loại bỏ ngay lập tức các phản hồi thuộc loại:
        + Vô nghĩa (VD: "asdf", "...", "hjhj", "ok").
        + Spam, đùa cợt nhảm nhí không liên quan bài học (VD: "Thìn Lò", "Phong xướng", tên riêng, "đói bụng quá").
        + Lời lẽ thiếu văn hóa.
      - Giữ lại các phản hồi:
        + Khen ngợi/Chê trách về bài học/giáo viên.
        + Câu hỏi về kiến thức.
        + Góp ý về phương pháp dạy.
        + Biểu đạt cảm xúc học tập.

      BƯỚC 2: PHÂN TÍCH & GOM NHÓM (CLUSTERING)
      - Với các phản hồi ĐÃ ĐƯỢC LỌC, hãy dịch tiếng lóng Gen Z sang tiếng Việt chuẩn.
      - Gom nhóm các ý kiến trùng lặp nội dung.
      - Đếm số lượng.

      DANH SÁCH INPUT:
      ${JSON.stringify(feedbacks)}

      YÊU CẦU OUTPUT (JSON Array thuần túy, không markdown):
      [
        {
          "category": "Tên nhóm vấn đề (Ngắn gọn)",
          "summary": "Mô tả nội dung (Đã chuẩn hóa)",
          "count": Số lượng phiếu,
          "type": "negative" | "positive" | "neutral" | "question",
          "original_sample": "Trích dẫn 1 câu gốc tiêu biểu"
        }
      ]
      
      Sắp xếp theo số lượng giảm dần. Nếu không còn tin nhắn nào sau khi lọc, trả về [].
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