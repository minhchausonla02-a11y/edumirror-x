// File: app/api/submit-survey/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import OpenAI from "openai";

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
    // 🛡️ BƯỚC 1: CƠ CHẾ THU GOM DỮ LIỆU (TẠO MENU MẪU)
    // ==========================================
    const { data: surveyData } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", surveyId)
      .single();
    
    let payloadObj = surveyData?.payload;
    if (typeof payloadObj === 'string') {
        try { payloadObj = JSON.parse(payloadObj); } catch(e){}
    }
    
    const questions = payloadObj?.questions || payloadObj?.survey_v2?.questions || [];
    
    let predefinedOptions: string[] = [];
    questions.forEach((q: any) => {
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt: string) => predefinedOptions.push(opt.trim()));
        }
    });

    // ==========================================
    // 🛡️ BƯỚC 2: XÁC THỰC TRỪ LÙI (BẮT CÂU TỰ LUẬN)
    // ==========================================
    let rawInputs: string[] = [];
    
    for (const key in answers) {
      const val = answers[key];
      
      if (Array.isArray(val) || typeof val !== "string" || val.trim().length === 0) {
          continue; 
      }
      
      const cleanVal = val.trim();

      if (predefinedOptions.length > 0) {
          if (predefinedOptions.includes(cleanVal)) {
              continue; 
          }
          rawInputs.push(cleanVal); 
      } else {
          if (key.toLowerCase().match(/^q[1-5](\_|$)/)) continue;
          rawInputs.push(cleanVal);
      }
    }
    
    let openFeedback = rawInputs.join(" | ");

    let aiAnalysis = { 
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false, 
      isHarsh: false, 
      isSOS: false, 
      summary: "Không có ý kiến gì thêm." 
    };

    // ==========================================
    // 🧠 BƯỚC 3: AI PHÂN LOẠI (NÂNG CẤP LUẬT SƯ PHẠM)
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            
            // 🚀 BỘ LUẬT PHÂN LOẠI ĐÃ ĐƯỢC CHUẨN HÓA SƯ PHẠM
            const prompt = `Bạn là Chuyên gia Tâm lý và Giám thị Học đường. 
            Nhiệm vụ của bạn là phân tích lời nhắn do học sinh tự gõ: "${openFeedback}" và tuân thủ NGHIÊM NGẶT các quy tắc sau:
            
            1. isSpam (Rác/Không liên quan): Gán TRUE nếu nội dung thuộc 1 trong 2 trường hợp:
               - Vô nghĩa: "asdasd", "123".
               - Không liên quan đến bài học/lớp học: Chuyện thời tiết ("nay trời mưa mát"), tán tỉnh ("anh nhớ em"), đi chơi ("hôm nay quên đi thi"), nói lấp lửng ("Vui", "Buồn" mà không giải thích).
            
            2. isSOS (Báo động An toàn): Gán TRUE CHỈ KHI có dấu hiệu nguy hiểm thực sự: Bạo lực thể xác ("đánh em", "chặn đường"), quấy rối, tẩy chay tập thể, hoặc có ý định tự tử.
            
            3. isHarsh (Nhạy cảm - Cần che chắn): Gán TRUE CHỈ KHI học sinh có lời lẽ XÚC PHẠM, ĐẢ KÍCH TRỰC TIẾP đến GIÁO VIÊN hoặc NHÀ TRƯỜNG ("thầy dạy dở ẹc", "bà cô này ác", "trù dập"). 
            
            * LƯU Ý SỰ KHÁC BIỆT GIỮA KỶ LUẬT (BÌNH THƯỜNG) VÀ NHẠY CẢM (HARSH):
            Nếu học sinh phản ánh việc các bạn khác làm ồn, trêu chọc nhẹ nhàng làm ảnh hưởng việc học (VD: "Bạn Tiến hay trêu em, mất trật tự làm em không tập trung được") -> Đây là GÓP Ý KỶ LUẬT LỚP HỌC HỢP LỆ. Gán isSpam = false, isSOS = false, isHarsh = false để hiện bình thường cho giáo viên xem.
            
            TRẢ VỀ JSON: 
            {
              "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình", 
              "tags": ["1-3 từ khóa"], 
              "isSpam": boolean, 
              "isHarsh": boolean, 
              "isSOS": boolean, 
              "summary": "Tóm tắt."
            }`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.1 
            });
            aiAnalysis = { ...aiAnalysis, ...JSON.parse(completion.choices[0].message.content || "{}") };
          }
        }
    } catch (aiError) { 
        console.error("Lỗi AI:", aiError); 
    }

    // ==========================================
    // 4. LƯU VÀO KÉT SẮT SUPABASE
    // ==========================================
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.is_spam = aiAnalysis.isSpam; 
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback; 
    
    if (openFeedback.trim().length > 0) {
        answers.q6_feedback_text = openFeedback;
    }

    const { error } = await supabase
      .from("survey_responses")
      .insert([{ survey_short_id: surveyId, answers: answers }]);

    if (error) throw error;

    return NextResponse.json({ ok: true });
    
  } catch (error: any) {
    console.error("Lỗi chí mạng API Submit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}