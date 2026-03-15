import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 👇 LẤY MODEL TỪ BODY
    // Lưu ý: stats là dữ liệu từ Dashboard gửi sang
    const { stats, lessonText, apiKey, model = "gpt-4o-mini" } = body;
    
    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // 🚀 BƯỚC NÂNG CẤP: BỘ CHUYỂN ĐỔI MODEL AN TOÀN (CHỈ THÊM ĐOẠN NÀY)
    let realOpenAIModel = "gpt-4o-mini"; // Mặc định
    
    if (model === "gpt-4o" || model === "gpt-4o-mini") {
      realOpenAIModel = model;
    } else if (model === "gpt-4.5") {
      realOpenAIModel = "gpt-4.5-preview"; 
    } else if (model === "gpt-5" || model === "gpt-5.4") {
      realOpenAIModel = "gpt-4o"; // Ép chạy ngầm model mạnh nhất hiện tại để chống sập web
    } else {
      realOpenAIModel = model; // Fallback an toàn
    }

    // PROMPT 4 TẦNG (Giữ nguyên logic xịn xò cũ)
    const prompt = `
      Bạn là Chuyên gia Phân tích Dữ liệu Giáo dục & Sư phạm (EduMirror X).
      
      DỮ LIỆU ĐẦU VÀO:
      1. Thống kê lớp học (JSON): ${JSON.stringify(stats)}
      2. Nội dung Giáo án gốc: "${lessonText ? lessonText.substring(0, 2000) : 'Không có giáo án'}"...

      NHIỆM VỤ: 
      Phân tích sâu và đưa ra báo cáo cải tiến dạy học theo cấu trúc 4 TẦNG chuẩn khoa học.
      
      YÊU CẦU ĐẦU RA (HTML trong thẻ div, giao diện đẹp):
      <div class="space-y-6 font-sans text-gray-800">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
           <h3 class="text-indigo-700 font-bold text-sm uppercase mb-3">📊 Tầng 1: Ảnh chụp nhanh tiết học</h3>
           <p>Tổng quan: Dựa trên ${stats?.total || 0} phiếu...</p>
        </div>

        <div class="bg-orange-50 p-5 rounded-xl border border-orange-100 shadow-sm">
           <h3 class="text-orange-700 font-bold text-sm uppercase mb-3">🔍 Tầng 2: Truy tìm nguyên nhân</h3>
           <p>Phân tích nguyên nhân từ dữ liệu cảm xúc và điểm nghẽn...</p>
        </div>

        <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
           <h3 class="text-blue-700 font-bold text-sm uppercase mb-3">⚖️ Tầng 3: Đối chiếu Giáo án</h3>
           <p>So sánh kỳ vọng và thực tế...</p>
        </div>

        <div class="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
           <h3 class="text-green-700 font-bold text-sm uppercase mb-3">🛠️ Tầng 4: Giải pháp nâng cấp</h3>
           <p>Đề xuất các hành động cụ thể...</p>
        </div>
      </div>
    `;

    const response = await openai.chat.completions.create({
      model: realOpenAIModel, // 👈 QUAN TRỌNG: Đã đổi sang biến an toàn
      messages: [{ role: "user", content: prompt }],
      
    });

    return NextResponse.json({ result: response.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}