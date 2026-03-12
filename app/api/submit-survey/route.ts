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
    // Lấy toàn bộ đáp án trắc nghiệm giáo viên soạn để làm màng lọc
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
    // Nếu không giống đáp án trong Menu -> Chắc chắn là học sinh tự gõ
    // ==========================================
    let rawInputs: string[] = [];
    
    for (const key in answers) {
      const val = answers[key];
      
      // Bỏ qua Array (chọn nhiều) và các ô trống
      if (Array.isArray(val) || typeof val !== "string" || val.trim().length === 0) {
          continue; 
      }
      
      const cleanVal = val.trim();

      if (predefinedOptions.length > 0) {
          if (predefinedOptions.includes(cleanVal)) {
              continue; // Là trắc nghiệm -> Bỏ qua
          }
          rawInputs.push(cleanVal); // Là tự luận -> Thu gom
      } else {
          // Bọc lót nếu không tải được DB
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
    // 🧠 BƯỚC 3: AI PHÂN LOẠI (ÁP DỤNG ĐÚNG BỘ QUY TẮC ĐÃ CHỐT)
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            
            // BỘ LUẬT PHÂN LOẠI 5 NHÓM
            const prompt = `Bạn là Chuyên gia Tâm lý và Giám thị Học đường. 
            Nhiệm vụ của bạn là đọc lời nhắn do học sinh tự gõ: "${openFeedback}" và phân loại theo CHUẨN SAU:
            
            1. isSpam (Thùng rác): Gán TRUE nếu nội dung VÔ NGHĨA ("asdasd") HOẶC CỢT NHẢ, TÁN TỈNH, KHÔNG LIÊN QUAN bài học ("anh nhớ em", "chiều chơi game", "thầy bao em ăn").
            2. isSOS (Báo động đỏ): Gán TRUE nếu có dấu hiệu bạo lực, đe dọa, tẩy chay, quấy rối, trầm cảm ("bạn đánh em", "muốn chết", "sờ soạng").
            3. isHarsh (Công kích): Gán TRUE nếu phàn nàn thô lỗ, đả kích cá nhân, nhắc tên giáo viên với thái độ tiêu cực ("dạy dở ẹc", "bà cô này nói nhiều").
            
            * LƯU Ý QUAN TRỌNG VỀ NHÓM BÌNH THƯỜNG:
            Nếu câu nhắn là lời khen, cảm ơn, góp ý chân thành, hoặc thắc mắc về bài học (VD: "thầy dạy rất cuốn", "giảng chậm lại", "em không hiểu bài") -> Gán TẤT CẢ isSpam = false, isSOS = false, isHarsh = false.
            
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
              temperature: 0.1 // Nhiệt độ thấp để AI tuân thủ luật nghiêm ngặt nhất
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
    answers.is_spam = aiAnalysis.isSpam; // Cờ này sẽ quyết định việc vứt vào Thùng Rác UI
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