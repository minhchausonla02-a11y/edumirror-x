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
    // 🛡️ BƯỚC 1: LẤY "DANH SÁCH ĐÁP ÁN MẪU" TỪ DATABASE
    // ==========================================
    const { data: surveyData } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", surveyId)
      .single();
    
    // Xử lý bóc tách dữ liệu JSON an toàn
    let payloadObj = surveyData?.payload;
    if (typeof payloadObj === 'string') {
        try { payloadObj = JSON.parse(payloadObj); } catch(e){}
    }
    
    // Tìm mảng câu hỏi
    const questions = payloadObj?.questions || payloadObj?.survey_v2?.questions || [];
    
    // Gom tất cả các đáp án trắc nghiệm giáo viên đã soạn vào một mảng Menu
    let predefinedOptions: string[] = [];
    questions.forEach((q: any) => {
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt: string) => predefinedOptions.push(opt.trim()));
        }
    });

    // ==========================================
    // 🛡️ BƯỚC 2: XÁC THỰC "TRỪ LÙI" THÔNG MINH
    // ==========================================
    let rawInputs: string[] = [];
    
    for (const key in answers) {
      const val = answers[key];
      
      // Bỏ qua mảng (ví dụ: học sinh tích chọn nhiều ô checkbox)
      if (Array.isArray(val) || typeof val !== "string" || val.trim().length === 0) {
          continue; 
      }
      
      const cleanVal = val.trim();

      if (predefinedOptions.length > 0) {
          // 🎯 NẾU CÂU TRẢ LỜI CÓ TRONG MENU TRẮC NGHIỆM -> CHẮC CHẮN LÀ TRẮC NGHIỆM -> VỨT BỎ!
          if (predefinedOptions.includes(cleanVal)) {
              continue;
          }
          // PHẦN CÒN LẠI KHÔNG NẰM TRONG MENU -> CHẮC CHẮN LÀ HỌC SINH TỰ GÕ!
          rawInputs.push(cleanVal);
      } else {
          // Phương án bọc lót (Fallback) phòng khi Database bị trễ mạng không lấy được Menu
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
    // 🧠 BƯỚC 3: AI PHÂN TÍCH
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Tâm lý Học đường. 
            Đọc lời nhắn do học sinh tự gõ: "${openFeedback}"
            
            QUY TẮC PHÂN LOẠI CỰC KỲ QUAN TRỌNG:
            1. isSpam: CHỈ gán TRUE nếu là rác gõ bừa hoàn toàn vô nghĩa ("asdasd", "123"). Các câu có ý nghĩa (dù là trêu đùa như "anh nhớ em", "hello thầy") -> BẮT BUỘC isSpam = FALSE.
            2. isSOS: Báo động nguy hiểm thật sự (bạo lực, trầm cảm, đe dọa).
            3. isHarsh: Chê bai thô lỗ, tấn công cá nhân.
            
            Trả JSON CHÍNH XÁC: 
            {
              "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình", 
              "tags": [], 
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
    // (Bao gồm cả is_spam để hiện lên Thùng Rác Dashboard)
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