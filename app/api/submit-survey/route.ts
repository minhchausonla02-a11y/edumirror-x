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
    // 1. LỌC TUYỆT ĐỐI BẰNG TÊN CÂU HỎI (KEY)
    // ==========================================
    let rawInputs = [];
    for (const key in answers) {
      const val = answers[key];
      const lowerKey = key.toLowerCase();

      // 🛡️ CHẶN CỨNG: Bỏ qua tất cả các câu từ Q1 đến Q5 (dù nội dung bên trong là gì đi nữa)
      if (lowerKey.includes("q1") || lowerKey.includes("q2") || 
          lowerKey.includes("q3") || lowerKey.includes("q4") || 
          lowerKey.includes("q5")) {
        continue;
      }

      // Bỏ qua mảng trắc nghiệm nhiều đáp án
      if (Array.isArray(val)) continue; 

      // Chỉ lấy chuỗi văn bản thuộc về Q6 hoặc các ô nhập chữ tự do
      if (typeof val === "string" && val.trim().length > 0) {
        rawInputs.push(val.trim());
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
    // 2. AI PHÂN TÍCH (Chỉ đọc những câu học sinh tự gõ)
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Tâm lý. Phân loại câu nói sau của học sinh: "${openFeedback}"
              
              1. isSpam: Rác gõ phím ("asdasd").
              2. isSOS: Cầu cứu, bắt nạt, đe dọa ("đánh em", "tẩy chay", "muốn chết").
              3. isHarsh: Chê bai thô lỗ, đả kích cá nhân, nhắc tên giáo viên với thái độ tiêu cực ("không thích thầy A", "dạy dở").
              
              Trả về JSON:
              {
                "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
                "tags": [],
                "isSpam": false,
                "isHarsh": false,
                "isSOS": false,
                "summary": "Tóm tắt ngắn gọn."
              }`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.1 
            });

            const aiResultStr = completion.choices[0].message.content || "{}";
            aiAnalysis = { ...aiAnalysis, ...JSON.parse(aiResultStr) };
          }
        }
    } catch (aiError) {
        console.error("⚠️ LỖI AI:", aiError);
    }

    if (aiAnalysis.isSpam) {
        return NextResponse.json({ ok: true, blocked: true });
    }

    // ==========================================
    // 3. LƯU KẾT QUẢ
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}