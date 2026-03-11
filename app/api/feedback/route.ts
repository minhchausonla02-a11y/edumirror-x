import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { AggregateSummary, FeedbackPacket } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory store (Tạm thời lưu trên RAM, sau này sẽ nối Supabase)
const DB: any[] = []; 

export async function POST(req: Request) {
  try {
    const data = await req.json() as FeedbackPacket;
    const answers = data.answers || {};

    // 1. Gom tất cả câu trả lời bằng chữ của học sinh (để AI đọc)
    let openFeedback = "";
    for (const key in answers) {
      if (typeof answers[key] === "string" && answers[key].length > 5) {
        openFeedback += answers[key] + " | ";
      }
    }

    // 2. Khởi tạo kết quả AI mặc định (nếu không có chữ nào)
    let aiAnalysis = { 
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false,
      isHarsh: false,
      summary: "Không có ý kiến gì thêm."
    };

    // 3. Gọi AI phân tích nếu học sinh có viết chữ
    if (openFeedback.trim().length > 0) {
      const apiKey = process.env.OPENAI_API_KEY; 
      
      if (apiKey) {
        const openai = new OpenAI({ apiKey });
        const prompt = `
          Bạn là chuyên gia tâm lý học giáo dục. Đọc phản hồi của học sinh: "${openFeedback}"
          
          Nhiệm vụ: Trả về JSON chính xác với các trường:
          {
            "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
            "tags": ["Từ khóa 1", "Từ khóa 2"], // Rút trích 1-2 vấn đề, VD: "Tốc độ nhanh", "Buồn ngủ"
            "isSpam": boolean, // TRUE CHỈ KHI học sinh gõ linh tinh vô nghĩa (VD: "asdasd"). FALSE nếu là phản hồi thật dù có chửi bậy.
            "isHarsh": boolean, // TRUE nếu câu chữ gay gắt, chê bai thô thiển, xúc phạm, không mô phạm.
            "summary": "string" // Nếu isHarsh=true, hãy tóm tắt lại ý đó bằng ngôn ngữ sư phạm, nhẹ nhàng, lịch sự. Nếu bình thường, tóm tắt giữ nguyên ý.
          }
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", // Model siêu nhanh và tiết kiệm
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" }
        });

        const aiResultStr = completion.choices[0].message.content || "{}";
        aiAnalysis = JSON.parse(aiResultStr);
      }
    }

    // 4. Đóng gói dữ liệu + Kết quả AI
    const enrichedData = { 
      ...data, 
      at: Date.now(),
      ai_sentiment: aiAnalysis.sentiment,
      ai_tags: aiAnalysis.tags,
      is_spam: aiAnalysis.isSpam,
      is_harsh: aiAnalysis.isHarsh,
      ai_summary: aiAnalysis.summary,
      raw_text: openFeedback // Vẫn giữ lại câu gốc để giáo viên dũng cảm có thể xem
    };

    // 5. Lưu vào kho (Chỉ lưu nếu không phải rác vô nghĩa)
    if (!aiAnalysis.isSpam) {
      DB.push(enrichedData);
    } else {
      console.log("🚫 AI đã chặn 1 phản hồi rác (Spam):", openFeedback);
    }

    return NextResponse.json({ ok: true, analyzed: true });

  } catch (error: any) {
    console.error("Lỗi AI xử lý phản hồi:", error);
    // Nếu lỗi AI, vẫn lưu dữ liệu thô để không mất bài của học sinh
    const data = await req.json().catch(() => ({}));
    DB.push({ ...data, at: Date.now(), is_error: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Hàm GET tạm thời để Dashboard có số liệu hiển thị
export async function GET() {
  const agg: AggregateSummary = { understood:0, notClear:0, tooFast:0, needExamples:0, total: DB.length };
  for (const fb of DB) {
    if (fb.is_spam) continue; 
    const a = fb.answers || {};
    if (a["q1"]) {
      const v = Number(a["q1"]);
      if (v >= 4) agg.understood++; else agg.notClear++;
    }
    if (a["q3"] === "Hơi nhanh" || a["q3"] === "Rất nhanh") agg.tooFast++;
    if (Array.isArray(a["q4"]) && (a["q4"] as string[]).includes("Ví dụ gần thực tế")) agg.needExamples++;
  }
  return NextResponse.json(agg);
}