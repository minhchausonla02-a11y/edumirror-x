// File: app/api/submit-survey/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import OpenAI from "openai"; // BỔ SUNG: Khai báo AI

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { surveyId, answers } = body;

    if (!surveyId || !answers) {
        return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    }

    // ==========================================
    // 1. GOM CHỮ ĐỂ AI ĐỌC (TÌM LỜI CẦU CỨU)
    // ==========================================
    let openFeedback = "";
    for (const key in answers) {
      // Chỉ lấy những câu trả lời là chữ (không lấy trắc nghiệm A B C)
      if (typeof answers[key] === "string" && answers[key].length > 5 && !answers[key].includes("A1") && !answers[key].includes("A2")) {
        openFeedback += answers[key] + " | ";
      }
    }

    // ==========================================
    // 2. KHỞI TẠO AI & PHÂN TÍCH (NẾU CÓ CHỮ)
    // ==========================================
    let aiAnalysis = { 
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false,
      isHarsh: false,
      isSOS: false, 
      summary: "Không có ý kiến gì thêm."
    };

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

    // ==========================================
    // 3. LỌC RÁC: NẾU LÀ SPAM -> CHẶN NGAY TỪ CỬA
    // ==========================================
    if (aiAnalysis.isSpam) {
        console.log("🚫 AI đã chặn 1 tin rác Spam:", openFeedback);
        // Bí quyết KHKT: Vẫn trả về ok: true để máy học sinh báo "Nộp thành công", 
        // nhưng thực chất server đã vứt nó vào sọt rác. (Kỹ thuật Shadowban)
        return NextResponse.json({ ok: true, blocked: true });
    }

    // ==========================================
    // 4. BƠM CỜ AI VÀO KẾT QUẢ ĐỂ LƯU SUPABASE
    // ==========================================
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback;
    
    // Đảm bảo cái Dashboard (đang dùng key q6_feedback_text) đọc được dữ liệu này
    if (openFeedback.trim().length > 0) {
        answers.q6_feedback_text = openFeedback;
    }

    // ==========================================
    // 5. LƯU VÀO SUPABASE (Giữ nguyên code của bạn)
    // ==========================================
    const { error } = await supabase
      .from("survey_responses")
      .insert([
        { 
          survey_short_id: surveyId, 
          answers: answers 
        }
      ]);

    if (error) {
        console.error("Lỗi khi lưu Supabase:", error);
        throw error;
    }

    if (aiAnalysis.isSOS) {
        console.log("🚨 ĐÃ LƯU 1 CẢNH BÁO SOS VÀO DATABASE!");
    }

    return NextResponse.json({ ok: true });
    
  } catch (error: any) {
    console.error("Lỗi API Submit Survey:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}