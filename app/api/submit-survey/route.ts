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

    let openFeedback = "";
    for (const key in answers) {
      if (typeof answers[key] === "string" && answers[key].length > 5 && !answers[key].includes("A1") && !answers[key].includes("A2")) {
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

    // ==========================================
    // 🛡️ HỘP CHỐNG SỐC AI: Nếu AI lỗi, vẫn cho đi tiếp
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Tâm lý Học đường.
              1. isSpam: Rác vô nghĩa ("asdasd").
              2. isSOS: Báo động đỏ (Cầu cứu, bắt nạt, trầm cảm, bôi nhọ đời tư). VD: "Bạn đánh em", "Ông B ngoại tình".
              3. isHarsh: Chê bai thô lỗ.
              Trả JSON: {"sentiment": "...", "tags": [], "isSpam": false, "isHarsh": false, "isSOS": false, "summary": "..."}
              Nội dung: "${openFeedback}"`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.2 
            });

            const aiResultStr = completion.choices[0].message.content || "{}";
            aiAnalysis = JSON.parse(aiResultStr);
          } else {
              console.log("⚠️ Không tìm thấy OPENAI_API_KEY, bỏ qua kiểm duyệt AI.");
          }
        }
    } catch (aiError) {
        console.error("⚠️ LỖI TRẠM KIỂM DUYỆT AI (Có thể hết Quota/Key sai) - Bỏ qua để cứu dữ liệu:", aiError);
        // Không throw error ở đây! Cứ để hệ thống chạy tiếp xuống dưới.
    }

    // ==========================================
    // LỌC RÁC
    // ==========================================
    if (aiAnalysis.isSpam) {
        console.log("🚫 AI chặn tin rác:", openFeedback);
        return NextResponse.json({ ok: true, blocked: true });
    }

    // ==========================================
    // BƠM CỜ VÀ LƯU SUPABASE
    // ==========================================
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
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
    console.error("Lỗi chí mạng API Submit Survey:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}