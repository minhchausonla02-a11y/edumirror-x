import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 🚀 THÊM THƯ VIỆN GEMINI
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🚀 LẤY THÊM geminiKey TỪ BODY
    const { stats, lessonText, apiKey, geminiKey, model = "gpt-5.4" } = body;
    
    // PROMPT 4 TẦNG (Đã bổ sung "Luật Thép" về Trình bày và Ngôn ngữ thuần Việt)
    const prompt = `
      Bạn là Chuyên gia Phân tích Dữ liệu Giáo dục & Cố vấn Sư phạm cấp cao tại Việt Nam (thuộc dự án EduMirror X).
      
      DỮ LIỆU ĐẦU VÀO:
      1. Thống kê lớp học (JSON): ${JSON.stringify(stats)}
      2. Nội dung Giáo án gốc: "${lessonText ? lessonText.substring(0, 2000) : 'Không có giáo án'}"...

      NHIỆM VỤ: 
      Phân tích sâu và đưa ra báo cáo cải tiến dạy học theo cấu trúc 4 TẦNG chuẩn khoa học.
      
      🔥 QUY TẮC NGÔN NGỮ VÀ VĂN PHONG (LUẬT THÉP BẮT BUỘC):
      - SỬ DỤNG 100% TIẾNG VIỆT THUẦN VIỆT, chuẩn văn phong sư phạm của Việt Nam (phù hợp với chương trình GDPT 2018).
      - TUYỆT ĐỐI KHÔNG dùng các từ tiếng Anh lóng, thuật ngữ doanh nghiệp hoặc phương Tây gây khó hiểu cho giáo viên.
      - BẮT BUỘC THAY THẾ CÁC TỪ SAU (nếu có định dùng):
        + KHÔNG DÙNG "KPI" -> Hãy dùng "Chỉ tiêu phấn đấu", "Mục tiêu định lượng".
        + KHÔNG DÙNG "Exit ticket" -> Hãy dùng "Phiếu kiểm tra cuối giờ", "Bài tập củng cố nhanh".
        + KHÔNG DÙNG "Core / Standard / Challenge" -> Hãy dùng "Mức độ Nhận biết / Thông hiểu / Vận dụng (Nâng cao)".
        + KHÔNG DÙNG "Mindmap" -> Hãy dùng "Sơ đồ tư duy".
        + KHÔNG DÙNG "Flashcard" -> Hãy dùng "Thẻ ghi nhớ", "Thẻ học tập".
      - Lời văn cần gần gũi, thực tế, dễ hiểu, mang tính chất tư vấn, động viên và hỗ trợ giáo viên.

      🔥 QUY TẮC TRÌNH BÀY CÔNG THỨC TOÁN/LÝ/HÓA BẮT BUỘC:
      - TUYỆT ĐỐI KHÔNG viết công thức dạng text thô sơ (ví dụ cấm viết: 3^x, 9^(x+1), log_2(x)).
      - BẮT BUỘC phải dùng định dạng HTML hoặc Unicode để công thức hiển thị chuẩn sư phạm.
      - Dùng thẻ HTML <sup> để viết số mũ, lũy thừa (VD: 3<sup>2x</sup>, 9<sup>x+1</sup>, a<sup>f(x)</sup>).
      - Dùng thẻ HTML <sub> để viết chỉ số dưới (VD: log<sub>2</sub>x, H<sub>2</sub>O).
      - Sử dụng các ký hiệu toán học chuẩn xác: ≠, ≥, ≤, ×, ÷, √, ⇒, ⇔.
      
      YÊU CẦU ĐẦU RA (HTML trong thẻ div, cấu trúc 4 tầng rõ ràng):
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

    // =========================================================
    // NGÃ RẼ 1: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN GEMINI
    // =========================================================
    if (model.startsWith("gemini")) {
      const rawGeminiKey = geminiKey || process.env.GOOGLE_GEMINI_API_KEY || "";
      const finalGeminiKey = rawGeminiKey.trim();

      if (!finalGeminiKey) return NextResponse.json({ error: "Thiếu Gemini API Key. Vui lòng cập nhật ở Panel kết nối." }, { status: 401 });

      // 🚀 CHỐT HẠ: Luôn luôn chuyển về gemini-2.0-flash cho an toàn, bất kể chọn tên ảo gì trên giao diện
      const realGeminiModel = "gemini-2.0-flash";

      const genAI = new GoogleGenerativeAI(finalGeminiKey);
      const geminiModel = genAI.getGenerativeModel({ model: realGeminiModel });

      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text();
      
      return NextResponse.json({ result: responseText });
    } 
    // =========================================================
    // NGÃ RẼ 2: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN OPENAI (Quy trình cũ)
    // =========================================================
    else {
      const finalKey = apiKey || process.env.OPENAI_API_KEY;
      if (!finalKey) return NextResponse.json({ error: "Thiếu OpenAI API Key. Vui lòng cập nhật ở Panel kết nối." }, { status: 401 });

      const openai = new OpenAI({ apiKey: finalKey });

      let apiModel = model; 
      if (model === "gpt-4.5") {
          apiModel = "gpt-4o"; 
      }

      const response = await openai.chat.completions.create({
        model: apiModel,
        messages: [{ role: "user", content: prompt }],
      });

      return NextResponse.json({ result: response.choices[0].message.content });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}