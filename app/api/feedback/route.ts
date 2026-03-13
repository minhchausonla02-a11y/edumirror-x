import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from '@/lib/supabase/server'; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    let answers = data.answers || {};

    let openFeedback = "";
    for (const key in answers) {
      if (typeof answers[key] === "string" && answers[key].length > 5) {
        openFeedback += answers[key] + " | ";
      }
    }

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
        
        // 🚀 PROMPT CẬP NHẬT: Đã thêm ví dụ "buồn vs quá" vào nhóm Rác
        const prompt = `
          Bạn là một Chuyên gia Tâm lý Học đường và Kỹ sư Dữ liệu (NLP) tại Việt Nam.
          Phân loại phản hồi ẩn danh của học sinh theo các tiêu chí sau:
          
          1. isSpam (Rác/Nhiễu): Các ký tự vô nghĩa, icon, từ đùa cợt ("Con vịt"), ngoại ngữ chửi thề ("Vattene, bastardo!"), HOẶC các câu teencode quá ngắn, cụt lủn, không rõ nghĩa ngữ cảnh sư phạm (VD: "buồn vs quá", "chán v"). Đưa vào đây để loại bỏ.
          2. isSOS (Báo động đỏ): Dấu hiệu bạo lực học đường ("bạo lực ngôn từ", "bị tẩy chay", "đánh nhau"), bắt nạt, trầm cảm, ý định tự tử. ƯU TIÊN CAO NHẤT.
          3. isHarsh (Khiên bảo vệ): Dùng từ ngữ thô tục tiếng Việt, xúc phạm giáo viên, lộ thông tin đời tư, nhưng CHƯA đến mức SOS.
          4. Bình thường: Góp ý bài giảng, cảm xúc học tập rõ ràng, lịch sự.
          
          Trả về JSON:
          {
            "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
            "tags": ["Từ khóa"], 
            "isSpam": boolean,
            "isHarsh": boolean,
            "isSOS": boolean,
            "summary": "Tóm tắt ý chính. Nếu isSpam=true, để trống."
          }
          
          Nội dung: "${openFeedback}"
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1 // Hạ temperature xuống 0.1 để AI bớt "sáng tạo", tuân thủ luật cứng hơn
        });

        const aiResultStr = completion.choices[0].message.content || "{}";
        aiAnalysis = JSON.parse(aiResultStr);
      }
    }

    // 🛡️ BỘ LỌC CỨNG: ÉP TỪ KHÓA SOS
    const sosKeywords = ["bạo lực", "tự tử", "đánh nhau", "tẩy chay", "bắt nạt", "cô lập", "trầm cảm", "muốn chết", "đánh em"];
    const lowerFeedback = openFeedback.toLowerCase();
    
    if (sosKeywords.some(keyword => lowerFeedback.includes(keyword))) {
        aiAnalysis.isSOS = true;
    }

    // 🚦 BƯỚC ĐỘC QUYỀN CỜ (CỰC KỲ QUAN TRỌNG ĐỂ FIX LỖI GIAO DIỆN)
    // Ưu tiên: SOS > Spam > Harsh. Đã thuộc nhóm này thì cấm nhận cờ nhóm khác.
    if (aiAnalysis.isSOS) {
        aiAnalysis.isSpam = false;
        aiAnalysis.isHarsh = false;
    } else if (aiAnalysis.isSpam) {
        aiAnalysis.isHarsh = false;
        aiAnalysis.isSOS = false;
    } else if (aiAnalysis.isHarsh) {
        aiAnalysis.isSpam = false;
        aiAnalysis.isSOS = false;
    }

    // Bơm Cờ vào dữ liệu để lưu Database
    answers.is_spam = aiAnalysis.isSpam;
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS; 
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback;
    
    if (openFeedback.trim().length > 0) {
        answers.q6_feedback_text = openFeedback; 
    }

    // LƯU SUPABASE
    const supabase = await createClient();
    const surveyIdToSave = data.surveyId || data.short_id || data.lessonId || "unknown_survey";

    const { error } = await supabase.from('survey_responses').insert({
        survey_short_id: surveyIdToSave,
        answers: answers
    });

    if (error) {
        console.error("Lỗi khi lưu Supabase:", error);
    }

    return NextResponse.json({ ok: true, analyzed: true });

  } catch (error: any) {
    console.error("Lỗi API Feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "API Feedback hoạt động bình thường" });
}