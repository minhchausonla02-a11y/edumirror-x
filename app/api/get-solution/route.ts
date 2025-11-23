import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { diagnosis, apiKey } = body;
    
    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // --- PROMPT ĐÃ TINH GỌN: CHỈ TẬP TRUNG GIẢI PHÁP ---
    const prompt = `
      Bạn là Chuyên gia Tư vấn Sư phạm & Phương pháp dạy học.
      
      ĐẦU VÀO (Báo cáo vấn đề từ lớp học):
      ${diagnosis}

      NHIỆM VỤ:
      Đề xuất 3 giải pháp sư phạm thực tế để giải quyết các vấn đề trên.
      - Tập trung vào kỹ thuật dạy học (Teaching Techniques).
      - Giải pháp phải cụ thể, khả thi để áp dụng ngay vào tiết sau.
      - Không viết kịch bản/lời thoại. Trình bày gãy gọn.

      YÊU CẦU ĐẦU RA (HTML trong thẻ div):
      <div class="space-y-4">
         
         <div class="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm">
            <h4 class="text-green-800 font-bold text-sm mb-1 flex items-center gap-2">🚀 Giải pháp 1: [Tên ngắn gọn]</h4>
            <p class="text-sm text-gray-700">[Mô tả chi tiết cách thực hiện]</p>
         </div>

         <div class="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
            <h4 class="text-blue-800 font-bold text-sm mb-1 flex items-center gap-2">⚡ Giải pháp 2: [Tên ngắn gọn]</h4>
            <p class="text-sm text-gray-700">[Mô tả chi tiết cách thực hiện]</p>
         </div>

         <div class="bg-white p-4 rounded-xl border-l-4 border-purple-500 shadow-sm">
            <h4 class="text-purple-800 font-bold text-sm mb-1 flex items-center gap-2">🛠️ Giải pháp 3: [Tên ngắn gọn]</h4>
            <p class="text-sm text-gray-700">[Mô tả chi tiết cách thực hiện]</p>
         </div>

      </div>
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5, // Độ sáng tạo vừa phải để giải pháp thiết thực
    });

    return NextResponse.json({ result: response.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}