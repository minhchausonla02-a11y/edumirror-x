import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stats, lessonText, apiKey } = body; 
    // stats: Số liệu từ Dashboard
    // lessonText: Nội dung giáo án (để đối chiếu)

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    // --- PROMPT 4 TẦNG CAO CẤP ---
    const prompt = `
      Bạn là Chuyên gia Phân tích Dữ liệu Giáo dục & Sư phạm (EduMirror X).
      
      DỮ LIỆU ĐẦU VÀO:
      1. Thống kê lớp học (JSON): ${JSON.stringify(stats)}
      2. Nội dung Giáo án gốc: "${lessonText ? lessonText.substring(0, 2000) : 'Không có giáo án'}"...

      NHIỆM VỤ: 
      Phân tích sâu và đưa ra báo cáo cải tiến dạy học theo cấu trúc 4 TẦNG chuẩn khoa học.
      
      YÊU CẦU ĐẦU RA (HTML trong thẻ div, giao diện đẹp, hiện đại):
      
      <div class="space-y-6 font-sans text-gray-800">
        
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
           <h3 class="text-indigo-700 font-bold text-sm uppercase mb-3 flex items-center gap-2">
             📊 Tầng 1: Ảnh chụp nhanh tiết học
           </h3>
           <div class="grid grid-cols-2 gap-4 text-sm">
             <div class="bg-indigo-50 p-3 rounded-lg">
               <span class="block text-indigo-500 text-xs font-bold">TỔNG QUAN</span>
               <span class="font-bold text-lg text-indigo-900">[Tổng số phiếu] HS phản hồi</span>
             </div>
             <div class="bg-pink-50 p-3 rounded-lg">
               <span class="block text-pink-500 text-xs font-bold">CẢM XÚC CHỦ ĐẠO</span>
               <span class="font-bold text-lg text-pink-900">[Cảm xúc lớn nhất] ([% nếu tính được])</span>
             </div>
             <div class="col-span-2 bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
               <ul class="list-disc list-inside space-y-1 text-gray-700">
                 <li>[Phân tích mức độ hiểu bài: Bao nhiêu % hiểu, bao nhiêu % chưa hiểu]</li>
                 <li>[Điểm nghẽn lớn nhất là gì? Bao nhiêu em gặp phải?]</li>
                 <li>[Ý kiến về tốc độ giảng dạy nổi bật nhất]</li>
               </ul>
             </div>
           </div>
        </div>

        <div class="bg-orange-50 p-5 rounded-xl border border-orange-100 shadow-sm">
           <h3 class="text-orange-700 font-bold text-sm uppercase mb-3 flex items-center gap-2">
             🔍 Tầng 2: Truy tìm nguyên nhân gốc rễ
           </h3>
           <ul class="space-y-2 text-sm text-gray-800">
             <li>
               <strong>1. Tại sao lớp [Cảm xúc hiện tại]?</strong> 
               <br/>→ Do [Nguyên nhân 1 từ dữ liệu: Nhanh/Khó/Ồn...]
             </li>
             <li>
               <strong>2. Tại sao kiến thức [Tên phần yếu nhất] bị hổng?</strong>
               <br/>→ Do [Phân tích logic: Thiếu ví dụ / Trừu tượng / Chưa có checkpoint...]
             </li>
             <li>
               <strong>3. Nhu cầu tiềm ẩn:</strong> Học sinh chọn nhiều [Mong muốn cao nhất] → Chứng tỏ [Suy luận sư phạm].
             </li>
           </ul>
        </div>

        <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
           <h3 class="text-blue-700 font-bold text-sm uppercase mb-3 flex items-center gap-2">
             ⚖️ Tầng 3: Đối chiếu Giáo án vs Thực tế
           </h3>
           <div class="flex gap-4 text-sm">
              <div class="flex-1 p-3 bg-white rounded-lg border border-blue-100">
                <strong class="text-blue-600 block mb-1">Kỳ vọng (Giáo án)</strong>
                [Trích xuất mục tiêu hoặc nội dung từ giáo án mà học sinh đang gặp khó]
              </div>
              <div class="flex items-center text-gray-400">⚡</div>
              <div class="flex-1 p-3 bg-white rounded-lg border border-red-100">
                <strong class="text-red-600 block mb-1">Thực tế (Survey)</strong>
                [Nêu thực trạng học sinh đang gặp phải trái ngược với kỳ vọng]
              </div>
           </div>
           <p class="mt-3 text-sm text-blue-800 italic">
             💡 <strong>Kết luận:</strong> [Mục tiêu dạy đạt hay chưa? Cần điều chỉnh trọng tâm vào đâu?]
           </p>
        </div>

        <div class="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
           <h3 class="text-green-700 font-bold text-sm uppercase mb-3 flex items-center gap-2">
             🛠️ Tầng 4: Gói giải pháp nâng cấp
           </h3>
           
           <div class="space-y-3">
             <div class="bg-white p-3 rounded-lg border-l-4 border-green-500">
               <strong class="text-green-800 text-sm">🎯 1. Điều chỉnh Nội dung & Nhịp độ</strong>
               <p class="text-sm text-gray-700 mt-1">[Gợi ý cụ thể: Thêm ví dụ gì? Giảng chậm lại bao nhiêu? Cắt bớt phần nào?]</p>
             </div>

             <div class="bg-white p-3 rounded-lg border-l-4 border-purple-500">
               <strong class="text-purple-800 text-sm">🧱 2. Scaffolding (Giàn giáo hỗ trợ)</strong>
               <ul class="list-disc list-inside text-sm text-gray-700 mt-1">
                 <li><strong>Ẩn dụ:</strong> [Gợi ý 1 hình ảnh ẩn dụ để giải thích khái niệm khó]</li>
                 <li><strong>Sửa sai:</strong> [Chỉ ra lỗi sai phổ biến và cách sửa nhanh]</li>
                 <li><strong>Bài tập mồi:</strong> [Gợi ý 1 dạng bài tập nhỏ để gỡ rối]</li>
               </ul>
             </div>

             <div class="bg-white p-3 rounded-lg border-l-4 border-pink-500">
               <strong class="text-pink-800 text-sm">🎭 3. Điều phối Cảm xúc</strong>
               <p class="text-sm text-gray-700 mt-1">[Gợi ý hoạt động nhỏ đầu giờ sau để thay đổi không khí: Game/Khen ngợi/Hít thở...]</p>
             </div>
           </div>
        </div>

      </div>
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    return NextResponse.json({ result: response.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}