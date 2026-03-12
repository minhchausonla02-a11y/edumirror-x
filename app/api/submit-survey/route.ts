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

    if (!surveyId || !answers) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

    // ==========================================
    // 🛡️ BƯỚC ĐỘT PHÁ: ĐỌC TRỰC TIẾP CẤU TRÚC PHIẾU TỪ DATABASE
    // Bất chấp việc thêm/xóa câu hỏi, hệ thống luôn biết chính xác câu nào là Tự luận (Text)
    // ==========================================
    const { data: surveyData } = await supabase.from("surveys").select("payload").eq("short_id", surveyId).single();
    let textKeys: string[] = [];
    
    if (surveyData?.payload?.questions) {
        surveyData.payload.questions.forEach((q: any, idx: number) => {
            if (q.type === 'text') textKeys.push(`q${idx + 1}`); // Lấy chính xác mã câu hỏi tự luận
        });
    }

    let rawInputs = [];
    for (const key in answers) {
      const val = answers[key];
      if (Array.isArray(val) || typeof val !== "string" || val.trim().length === 0) continue;
      
      if (textKeys.length > 0) {
          // Chỉ gom chữ từ NHỮNG CÂU ĐƯỢC ĐỊNH NGHĨA LÀ TEXT trong Database
          if (textKeys.some(tk => key.toLowerCase().startsWith(tk))) {
              rawInputs.push(val.trim());
          }
      } else {
          // Dự phòng nếu mất kết nối DB: Lọc theo tên biến
          if (key.toLowerCase().includes("text") || key.toLowerCase().includes("feedback")) {
              rawInputs.push(val.trim());
          }
      }
    }
    
    let openFeedback = rawInputs.join(" | ");
    let aiAnalysis = { sentiment: "Trung tính", tags: [], isSpam: false, isHarsh: false, isSOS: false, summary: "" };

    // ==========================================
    // 🧠 AI KIỂM DUYỆT (TÌM RÁC, TÌM SOS)
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Tâm lý. Đọc lời nhắn: "${openFeedback}"
            1. isSpam: Rác vô nghĩa gõ bừa ("asdasd", "123"). Câu có nghĩa như "em rất thích học thầy" KHÔNG PHẢI SPAM.
            2. isSOS: Báo động nguy hiểm (bạo lực, trầm cảm).
            3. isHarsh: Chê bai thô lỗ.
            Trả JSON: {"sentiment": "...", "tags": [], "isSpam": boolean, "isHarsh": boolean, "isSOS": boolean, "summary": "..."}`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.1 
            });
            aiAnalysis = { ...aiAnalysis, ...JSON.parse(completion.choices[0].message.content || "{}") };
          }
        }
    } catch (aiError) { console.error("Lỗi AI:", aiError); }

    // ==========================================
    // 3. KHÔNG BLOCK NỮA -> LƯU TẤT CẢ VÀO DATABASE ĐỂ ĐƯA VÀO THÙNG RÁC
    // ==========================================
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.is_spam = aiAnalysis.isSpam; // 🔴 Đóng dấu Spam để Dashboard gom vào thùng rác
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback; 
    
    if (openFeedback.trim().length > 0) answers.q6_feedback_text = openFeedback;

    const { error } = await supabase.from("survey_responses").insert([{ survey_short_id: surveyId, answers: answers }]);
    if (error) throw error;

    return NextResponse.json({ ok: true });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}