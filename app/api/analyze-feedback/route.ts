// File: app/api/analyze-feedback/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 ĐÃ NÂNG CẤP: Lấy model từ body, nếu không có sẽ mặc định là GPT-5.4 tiêu chuẩn
    const { feedbacks, apiKey, model = "gpt-5.4" } = body;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({ result: [] });
    }

    const openai = new OpenAI({ apiKey: finalKey });

    // --- PROMPT: BỘ LỌC SƯ PHẠM & DỊCH THUẬT GEN Z (GIỮ NGUYÊN VÌ ĐÃ QUÁ XUẤT SẮC) ---
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

      YÊU CẦU ĐẦU RA (JSON Array thuần túy, KHÔNG markdown):
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

    const response = await openai.chat.completions.create({
      model: model, // 🚀 CHẠY ĐÚNG MODEL MÀ GIÁO VIÊN ĐANG CHỌN TRÊN GIAO DIỆN (GPT-5.4 hoặc Pro)
      messages: [{ role: "user", content: prompt }],
      // LƯU Ý: Không cài đặt 'temperature' ở đây để tương thích tối đa với dòng model GPT-5 / o-series
    });

    let content = response.choices[0].message.content || "[]";
    // Làm sạch JSON phòng trường hợp AI trả về markdown code block
    content = content.replace(/```json|```/g, "").trim();
    
    return NextResponse.json({ result: JSON.parse(content) });

  } catch (error: any) {
    console.error("Analyze Feedback Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}