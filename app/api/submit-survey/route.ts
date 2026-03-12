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
    // 1. GOM MỌI CHUỖI VĂN BẢN ĐỂ AI SÀNG LỌC LẠI
    // ==========================================
    let rawInputs = [];
    for (const key in answers) {
      const val = answers[key];
      if (Array.isArray(val)) continue; // Bỏ qua mảng trắc nghiệm nhiều đáp án
      if (typeof val === "string" && val.trim().length > 0) {
        rawInputs.push(val.trim());
      }
    }
    
    // Nối tất cả lại thành 1 chuỗi để gửi cho AI đọc
    let openFeedback = rawInputs.join(" | ");

    let aiAnalysis = { 
      extracted_message: "", // 🚀 VŨ KHÍ MỚI: Dùng AI để trích xuất tin nhắn thật
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false,
      isHarsh: false,
      isSOS: false, 
      summary: "Không có ý kiến gì thêm."
    };

    // ==========================================
    // 2. NHỜ AI BÓC TÁCH VÀ TRÍCH XUẤT THÔNG ĐIỆP
    // ==========================================
    try {
        if (openFeedback.trim().length > 0) {
          const apiKey = process.env.OPENAI_API_KEY; 
          
          if (apiKey) {
            const openai = new OpenAI({ apiKey });
            const prompt = `Bạn là Chuyên gia Phân tích Dữ liệu Học đường.
              Học sinh gửi lên một chuỗi các câu trả lời: "${openFeedback}"
              
              Nhiệm vụ của bạn là LỌC RÁC TRẮC NGHIỆM:
              - Các cụm từ như "Lựa chọn 1", "Lựa chọn 2", "A1 - ...", "B2 - ...", "Đồng ý", "Bình thường" là ĐÁP ÁN TRẮC NGHIỆM máy móc.
              - Bạn PHẢI TÌM VÀ TRÍCH XUẤT ra ĐÚNG phần câu văn tự do mà học sinh CỐ TÌNH TỰ GÕ VÀO (thường là câu dài, chứa cảm xúc, hoặc lời nhắn nhủ, kêu cứu).
              
              Sau khi trích xuất được câu tự gõ, hãy phân loại:
              1. isSpam: Rác gõ phím ("asdasd").
              2. isSOS: Cầu cứu, bắt nạt, đe dọa ("bị bạn an nói xấu", "đánh em").
              3. isHarsh: Chê bai thô lỗ.
              
              Trả về JSON ĐÚNG ĐỊNH DẠNG SAU:
              {
                "extracted_message": "GIỮ NGUYÊN VĂN phần học sinh tự gõ. Bỏ hết các đáp án trắc nghiệm đi. Nếu không có gì tự gõ, trả về chuỗi rỗng ''",
                "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
                "tags": [],
                "isSpam": false,
                "isHarsh": false,
                "isSOS": false,
                "summary": "Tóm tắt"
              }`;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.1 // Để AI tư duy logic nhất
            });

            const aiResultStr = completion.choices[0].message.content || "{}";
            // Gộp kết quả phân tích của AI vào biến aiAnalysis
            aiAnalysis = { ...aiAnalysis, ...JSON.parse(aiResultStr) };
          }
        }
    } catch (aiError) {
        console.error("⚠️ LỖI TRẠM KIỂM DUYỆT AI:", aiError);
    }

    if (aiAnalysis.isSpam) {
        return NextResponse.json({ ok: true, blocked: true });
    }

    // ==========================================
    // 3. LƯU KẾT QUẢ ĐÃ ĐƯỢC AI "TẨY RỬA" VÀO DATABASE
    // ==========================================
    
    // 🔥 BÍ QUYẾT: Dùng phần chữ đã được AI lọc sạch (extracted_message) để lưu
    // Nếu AI vô tình trả về rỗng, mới dùng tạm openFeedback làm phương án dự phòng
    const finalCleanMessage = aiAnalysis.extracted_message && aiAnalysis.extracted_message.trim().length > 0 
                         ? aiAnalysis.extracted_message 
                         : openFeedback;

    answers.is_harsh = aiAnalysis.isHarsh;
    answers.is_sos = aiAnalysis.isSOS;
    answers.ai_summary = aiAnalysis.summary;
    answers.raw_text = finalCleanMessage; // UI Dashboard sẽ chỉ đọc biến sạch sẽ này!
    
    if (finalCleanMessage.trim().length > 0) {
        answers.q6_feedback_text = finalCleanMessage;
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