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
    // 🛡️ LỚP LỌC 1: BỨC TƯỜNG LỬA TỪ KHÓA (WHITELIST)
    // ==========================================
    let rawInputs = [];
    for (const key in answers) {
      const val = answers[key];
      const lowerKey = key.toLowerCase();

      // 🎯 QUY TẮC THÉP: Chỉ lấy dữ liệu từ các biến có tên ám chỉ việc "Nhập chữ"
      // Các biến trắc nghiệm (như q1_feeling, q2_understanding...) SẼ BỊ BỎ QUA HOÀN TOÀN
      // Dù nội dung bên trong trắc nghiệm có là câu chửi thề hay cầu cứu cũng không lấy!
      const isExplicitTextField = 
        lowerKey.includes("text") || 
        lowerKey.includes("feedback") || 
        lowerKey.includes("message") || 
        lowerKey.includes("comment") || 
        lowerKey.includes("note");

      if (!isExplicitTextField) {
        continue; // Bỏ qua ngay lập tức mọi câu trắc nghiệm
      }

      // Bỏ qua mảng (checkbox chọn nhiều)
      if (Array.isArray(val)) continue; 

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
    // 🧠 LỚP LỌC 2: AI KIỂM DUYỆT TẦNG SÂU
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Tâm lý Học đường. 
            Bạn đang đọc nội dung từ Ô NHẬP LỜI NHẮN TỰ DO của học sinh: "${openFeedback}"
            
            NHIỆM VỤ CỦA BẠN:
            1. Lọc rác: Bỏ qua các câu vô nghĩa ("asdasd", "123").
            2. Nhận diện SOS: Học sinh đang gặp nguy hiểm, bị bắt nạt, đe dọa, trầm cảm ("đánh em", "tẩy chay", "muốn chết", "sợ hãi").
            3. Nhận diện Harsh: Lời chê bai thô lỗ, tấn công cá nhân giáo viên ("dạy dở", "ghét thầy/cô").
            4. Trắc nghiệm lạc loài: Nếu học sinh lười biếng, copy/paste một đáp án trắc nghiệm vào ô này (VD: "Mơ hồ (Cần xem lại)"), hãy coi đó là bình thường (Không SOS, Không Harsh).
            
            Trả về JSON CHÍNH XÁC:
            {
              "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
              "tags": ["Từ khóa"],
              "isSpam": boolean,
              "isHarsh": boolean,
              "isSOS": boolean,
              "summary": "Tóm tắt ngắn gọn. Nếu isHarsh, dịch thành lời góp ý sư phạm lịch sự."
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

    // Nếu AI đánh giá là Spam gõ phím vô nghĩa -> Chặn không lưu
    if (aiAnalysis.isSpam) {
        return NextResponse.json({ ok: true, blocked: true });
    }

    // ==========================================
    // 3. LƯU VÀO KÉT SẮT SUPABASE
    // ==========================================
    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = openFeedback; 
    
    // Đảm bảo Dashboard cũ vẫn đọc được
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