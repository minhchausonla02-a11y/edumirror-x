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
    // 🛡️ BƯỚC 1: TẠO MENU TRẮC NGHIỆM ĐỂ ĐỐI CHIẾU
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
    // 🛡️ BƯỚC 2: XÁC THỰC TRỪ LÙI (LỌC LẤY CHỮ TỰ GÕ)
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
      sentiment: "Trung lập", 
      tags: [] as string[], 
      isSpam: false, 
      isHarsh: false, 
      isSOS: false, 
      summary: "Không có ý kiến gì thêm." 
    };

    // ==========================================
    // 🧠 BƯỚC 3: PHÂN TÍCH NLP 4 CHIỀU (SIÊU CẤP SƯ PHẠM)
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            
          // 🚀 BỘ NÃO NLP: NẠP TRIẾT LÝ SƯ PHẠM VÀO AI (PHIÊN BẢN CỰC KỲ KHẮT KHE)
            const prompt = `Bạn là Chuyên gia Tâm lý Sư phạm và Kỹ sư Xử lý Ngôn ngữ Tự nhiên (NLP). 
            Nhiệm vụ của bạn là phân tích lời nhắn tự do của học sinh: "${openFeedback}" dựa trên Khung NLP:

            1. LỜI NHẮN HỢP LỆ (TẬP TRUNG VÀO BÀI GIẢNG):
               - Lời khen/chê bài giảng, phương pháp dạy ("thầy dạy cuốn", "giảng nhanh quá").
               - Trạng thái nhận thức/thể chất ảnh hưởng học tập ("em không hiểu bài", "nhức đầu", "buồn ngủ", "quá tải").

            2. RÁC (SPAM) - PHẢI GÁN TRUE CHO CÁC TRƯỜNG HỢP SAU:
               - Vô nghĩa: "asd", "123".
               - Giao tiếp ngoài luồng: "chiều đi net không", "mua acc game".
               - MÁCH LẺO CHUYỆN VẶT CỦA BẠN BÈ: Những phàn nàn nhỏ nhặt về bạn bè không liên quan trực tiếp đến thầy cô hay bài giảng ("bạn Thuỷ cười to quá", "bạn An hay trêu em", "bạn kia lấy bút của em"). ĐÂY LÀ RÁC ĐỐI VỚI HỆ THỐNG NÀY.

            3. CÔNG KÍCH (isHarsh):
               - CHỈ gán isHarsh = TRUE khi XÚC PHẠM, ĐẢ KÍCH CÁ NHÂN GIÁO VIÊN ("dạy dở ẹc", "bà cô này ác").

            4. BÁO ĐỘNG AN TOÀN (isSOS):
               - CHỈ gán isSOS = TRUE khi rủi ro nghiêm trọng: Bạo lực học đường ("đánh em", "chặn đường"), quấy rối, tẩy chay tập thể.

            TRẢ VỀ JSON CHÍNH XÁC: 
            {
              "sentiment": "Tích cực" | "Tiêu cực" | "Trung lập", 
              "tags": ["Tag 1", "Tag 2"], 
              "isSpam": boolean, 
              "isHarsh": boolean, 
              "isSOS": boolean, 
              "summary": "Tóm tắt ngắn gọn."
            }`;

           const completion = await openai.chat.completions.create({
             model: "gpt-4o-mini", // SỬA ĐÚNG TÊN MODEL THẬT ĐỂ TRÁNH LỖI
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.1 // Cố định nhiệt độ thấp để AI tuân thủ luật phân tích logic
            });
            aiAnalysis = { ...aiAnalysis, ...JSON.parse(completion.choices[0].message.content || "{}") };
          }
        }
    } catch (aiError) { 
        console.error("Lỗi AI NLP:", aiError); 
    }

    // ==========================================
    // 4. LƯU KẾT QUẢ VÀO SUPABASE
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
    console.error("Lỗi API Submit:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}