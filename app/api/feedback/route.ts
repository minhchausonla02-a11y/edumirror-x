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

    // 1. Gom tất cả câu trả lời bằng chữ của học sinh
    let openFeedback = "";
    for (const key in answers) {
      if (typeof answers[key] === "string" && answers[key].length > 5) {
        openFeedback += answers[key] + " | ";
      }
    }

    // 2. Khởi tạo kết quả AI mặc định (Trạng thái an toàn)
    let aiAnalysis = { 
      sentiment: "Trung tính", 
      tags: [] as string[], 
      isSpam: false,
      isHarsh: false,
      isSOS: false, // 🚨 CỜ BÁO ĐỘNG ĐỎ
      summary: "Không có ý kiến gì thêm."
    };

    // 3. Gọi AI phân tích với Bộ Prompt "Few-Shot" siêu mạnh mẽ
    if (openFeedback.trim().length > 0) {
      const apiKey = process.env.OPENAI_API_KEY; 
      
      if (apiKey) {
        const openai = new OpenAI({ apiKey });
        const prompt = `
          Bạn là một Chuyên gia Tâm lý Học đường và Kỹ sư Dữ liệu (NLP) xuất sắc.
          Nhiệm vụ: Đọc phản hồi ẩn danh của học sinh sau tiết học và phân loại vào định dạng JSON chính xác.

          HƯỚNG DẪN PHÂN LOẠI & VÍ DỤ (FEW-SHOT LEARNING):
          
          1. isSpam (Rác vô nghĩa): Chữ gõ linh tinh, không mang ý nghĩa ngôn ngữ.
             - VD: "asdasdasd", "12345", "hjkhjk" => isSpam: true

          2. isSOS (Báo động đỏ / Cầu cứu / Bạo lực / Vi phạm Đời tư): Lời cầu cứu, bắt nạt, quấy rối, trầm cảm, bôi nhọ đời tư cá nhân không liên quan đến bài giảng. ĐÂY LÀ ƯU TIÊN CAO NHẤT. Nếu nghi ngờ, hãy đánh dấu là true để con người (giáo viên) kiểm tra lại.
             - VD 1: "Em muốn chết, áp lực quá" => isSOS: true
             - VD 2: "Bạn A lớp trưởng ăn cắp tiền", "Thầy B sờ đùi em" => isSOS: true
             - VD 3: "Bọn nó tẩy chay em trên Facebook" => isSOS: true

          3. isHarsh (Sự thật thô ráp về CHUYÊN MÔN): Lời chê bai BÀI GIẢNG nhưng dùng từ ngữ gay gắt, thô lỗ, thiếu tôn trọng.
             - VD 1: "Thầy dạy chán vãi cả chưởng, buồn ngủ muốn xỉu" => isHarsh: true (Tóm tắt: "Học sinh cảm thấy thiếu hứng thú và khó theo dõi bài")
             - VD 2: "Bà cô giảng như máy khâu, chả hiểu mẹ gì" => isHarsh: true (Tóm tắt: "Tốc độ giảng bài nhanh khiến học sinh khó tiếp thu")

          4. Phản hồi bình thường: Góp ý lịch sự, khen ngợi, hoặc nêu khó khăn cụ thể.
             - VD: "Em chưa hiểu phần đồ thị", "Thầy giảng hay lắm" => Cả 3 cờ (isSpam, isSOS, isHarsh) đều là false.

          ĐỊNH DẠNG JSON YÊU CẦU TRẢ VỀ:
          {
            "sentiment": "Tích cực" | "Tiêu cực" | "Trung bình",
            "tags": ["Từ khóa 1", "Từ khóa 2"], 
            "isSpam": boolean,
            "isHarsh": boolean,
            "isSOS": boolean,
            "summary": "Tóm tắt ý chính. Nếu isHarsh=true, dịch sang ngôn ngữ sư phạm. Nếu isSOS=true, ghi rõ CẢNH BÁO: [Tóm tắt ngắn gọn nội dung khẩn cấp để giáo viên nắm bắt]."
          }

          Nội dung phản hồi cần phân tích: "${openFeedback}"
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2 // Set nhiệt độ thấp để AI trả lời ổn định, logic nhất
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
      is_sos: aiAnalysis.isSOS, // Lưu cờ SOS vào Database
      ai_summary: aiAnalysis.summary,
      raw_text: openFeedback 
    };

    // 5. Lưu vào kho (Lưu tất cả vào DB, kể cả rác, để làm bằng chứng cho hệ thống "Thùng rác")
    // API GET phía sau sẽ tự động lọc rác ra khỏi biểu đồ thống kê.
    DB.push(enrichedData);
    
    if (aiAnalysis.isSpam) console.log("🚫 AI đã bắt được Spam:", openFeedback);
    if (aiAnalysis.isSOS) console.log("🚨 CẢNH BÁO SOS:", openFeedback);

    return NextResponse.json({ ok: true, analyzed: true });

  } catch (error: any) {
    console.error("Lỗi AI xử lý phản hồi:", error);
    const data = await req.json().catch(() => ({}));
    DB.push({ ...data, at: Date.now(), is_error: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Hàm GET (Tạm thời cho bộ nhớ RAM, nếu bạn dùng Supabase thì không cần hàm này ở đây)
export async function GET() {
  const agg: AggregateSummary = { understood:0, notClear:0, tooFast:0, needExamples:0, total: DB.length };
  for (const fb of DB) {
    // 💡 LỌC CỨNG Ở ĐÂY: Spam không bao giờ được tính vào thống kê!
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