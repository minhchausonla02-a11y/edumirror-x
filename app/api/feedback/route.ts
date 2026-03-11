import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@/lib/supabase/server'; // KẾT NỐI SUPABASE

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    let answers = data.answers || {};

    // 1. Gom tất cả câu trả lời bằng chữ của học sinh
    let openFeedback = "";
    for (const key in answers) {
      if (typeof answers[key] === "string" && answers[key].length > 5) {
        openFeedback += answers[key] + " | ";
      }
    }

    // 2. Khởi tạo kết quả AI mặc định
    let aiAnalysis = { 
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false,
      isHarsh: false,
      isSOS: false, 
      summary: "Không có ý kiến gì thêm."
    };

    // 3. Gọi AI phân tích (Nếu học sinh có nhập chữ)
    if (openFeedback.trim().length > 0) {
      const apiKey = process.env.OPENAI_API_KEY; 
      
      if (apiKey) {
        const openai = new OpenAI({ apiKey });
        const prompt = `
          Bạn là một Chuyên gia Tâm lý Học đường và Kỹ sư Dữ liệu (NLP).
          Phân loại phản hồi ẩn danh của học sinh theo các tiêu chí sau:
          
          1. isSpam: Rác vô nghĩa ("asdasd", "123").
          2. isSOS: Báo động đỏ (Cầu cứu, bắt nạt, quấy rối, trầm cảm, bôi nhọ đời tư). ƯU TIÊN CAO NHẤT. VD: "Bạn A đánh em", "Áp lực quá", "Ông B ngoại tình".
          3. isHarsh: Lời chê bai BÀI GIẢNG nhưng dùng từ ngữ thô lỗ. VD: "Dạy chán vãi, buồn ngủ".
          4. Bình thường: Góp ý lịch sự ("Thầy giảng nhanh", "Chưa hiểu bài").
          
          Trả về JSON ĐÚNG ĐỊNH DẠNG:
          {
            "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
            "tags": ["Từ khóa 1", "Từ khóa 2"], 
            "isSpam": boolean,
            "isHarsh": boolean,
            "isSOS": boolean,
            "summary": "Tóm tắt ý chính. Nếu isHarsh=true, dịch sang ngôn ngữ sư phạm."
          }
          
          Nội dung: "${openFeedback}"
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2 
        });

        const aiResultStr = completion.choices[0].message.content || "{}";
        aiAnalysis = JSON.parse(aiResultStr);
      }
    }

    // ========================================================
    // LỌC RÁC: NẾU LÀ SPAM -> CHẶN NGAY TỪ CỬA
    // ========================================================
    if (aiAnalysis.isSpam) {
        console.log("🚫 AI đã chặn 1 tin rác Spam:", openFeedback);
        return NextResponse.json({ ok: true, blocked: true });
    }

    // 4. Bơm các Cờ AI vào dữ liệu để gửi lên Supabase
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback;
    
    // Đảm bảo Dashboard đọc được Lời nhắn
    if (openFeedback.trim().length > 0) {
        answers.q6_feedback_text = openFeedback; 
    }

    // ========================================================
    // LƯU DỮ LIỆU SẠCH VÀO SUPABASE
    // ========================================================
    const supabase = await createClient();
    
    // Tìm ID của phiếu (Hỗ trợ nhiều kiểu gửi ID từ Form học sinh)
    const surveyIdToSave = data.surveyId || data.short_id || data.lessonId || "unknown_survey";

    const { error } = await supabase.from('survey_responses').insert({
        survey_short_id: surveyIdToSave,
        answers: answers
    });

    if (error) {
        console.error("Lỗi khi lưu Supabase:", error);
    } else if (aiAnalysis.isSOS) {
        console.log("🚨 ĐÃ LƯU 1 CẢNH BÁO SOS VÀO DATABASE!");
    }

    return NextResponse.json({ ok: true, analyzed: true });

  } catch (error: any) {
    console.error("Lỗi API Feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Giữ lại hàm GET cơ bản để Next.js không báo lỗi cấu trúc Route Handler
export async function GET() {
  return NextResponse.json({ message: "API Feedback hoạt động bình thường" });
}