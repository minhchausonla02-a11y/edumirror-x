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
        
        // --- PROMPT ĐÃ ĐƯỢC NÂNG CẤP DÀNH CHO KHKT 2026 ---
        const prompt = `
          Bạn là một Chuyên gia Tâm lý Học đường và Kỹ sư Dữ liệu (NLP) tại Việt Nam.
          Phân loại phản hồi ẩn danh của học sinh theo các tiêu chí sau:
          
          1. isSpam (Rác/Nhiễu): Các ký tự vô nghĩa ("asdasd", ":))", icon), các từ đùa cợt không ngữ cảnh ("Con vịt", "Thợ trộm gà"), HOẶC các câu ngoại ngữ mang tính chửi thề/spam không thuộc giao tiếp lớp học (VD: "Vattene, bastardo!"). Đưa vào đây để hệ thống loại bỏ.
          2. isSOS (Báo động đỏ): Bất kỳ dấu hiệu/từ khóa nào về bạo lực học đường ("bạo lực ngôn từ", "bị tẩy chay", "đánh nhau"), bắt nạt, quấy rối, trầm cảm, ý định tự tử. ƯU TIÊN CAO NHẤT. Bắt nhầm còn hơn bỏ sót. Đưa ngay vào SOS.
          3. isHarsh (Khiên bảo vệ): Dùng từ ngữ thô tục bằng tiếng Việt, chửi thề, xúc phạm giáo viên/bạn bè, hoặc lộ thông tin đời tư nhạy cảm, nhưng CHƯA đến mức nguy hiểm tâm lý như SOS.
          4. Bình thường: Góp ý về bài giảng, tốc độ, cảm xúc học tập (dù khen hay chê nhưng dùng từ lịch sự).
          
          Trả về JSON ĐÚNG ĐỊNH DẠNG:
          {
            "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
            "tags": ["Từ khóa 1", "Từ khóa 2"], 
            "isSpam": boolean,
            "isHarsh": boolean,
            "isSOS": boolean,
            "summary": "Tóm tắt ý chính. Nếu isHarsh=true, dịch sang ngôn ngữ sư phạm nhẹ nhàng. Nếu isSpam=true, để trống."
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
    // XỬ LÝ LỌC RÁC: GHI NHẬN ĐỂ HIỂN THỊ LÊN THÙNG RÁC GIAO DIỆN
    // ========================================================
    if (aiAnalysis.isSpam) {
        // Log ra server để theo dõi, nhưng KHÔNG return chặn lại nữa
        // để dữ liệu được đi tiếp vào database và hiện lên "Thùng rác"
        console.log("🗑️ AI đã đưa 1 tin rác vào Thùng Rác:", openFeedback);
    }

    // 4. Bơm các Cờ AI vào dữ liệu để gửi lên Supabase
    answers.is_spam = aiAnalysis.isSpam; // Thêm trường này để Frontend lọc được thùng rác
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback;
    
    // Đảm bảo Dashboard đọc được Lời nhắn
    if (openFeedback.trim().length > 0) {
        answers.q6_feedback_text = openFeedback; 
    }

    // ========================================================
    // LƯU DỮ LIỆU VÀO SUPABASE
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