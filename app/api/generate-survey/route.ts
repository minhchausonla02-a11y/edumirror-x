import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hàm parse JSON an toàn
function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

// =====================================================================
// KIẾN TRÚC "TỦ HỒ SƠ" - ĐÃ TỐI ƯU PROMPT THEO CHUẨN KHKT
// =====================================================================
const SUBJECT_CONFIGS: Record<string, any> = {

  // 1. KHỐI TỰ NHIÊN (TOÁN / LÝ / HÓA)
  "Toán học": {
    buildPrompt: (processMode: string, standards: string) => `
      Bạn là một Chuyên gia Phương pháp giảng dạy Toán học.
      Nhiệm vụ của bạn là đọc giáo án và tìm ra 4-5 LỖI SAI KINH ĐIỂN, ĐIỂM MÙ TƯ DUY hoặc BƯỚC TÍNH TOÁN DỄ NHẦM LẪN NHẤT.

      ${standards 
        ? `🔥 MỤC TIÊU TỐI THƯỢNG: Giáo viên đã chỉ định YÊU CẦU CẦN ĐẠT: "${standards}". Bạn CHỈ ĐƯỢC PHÉP tìm ra các nguyên nhân, lỗi sai khiến học sinh THẤT BẠI trong việc đạt được chuẩn này. TUYỆT ĐỐI KHÔNG phân tích các phần kiến thức râu ria khác.` 
        : `🔍 MỤC TIÊU QUÉT RỘNG: Hãy phân tích toàn diện giáo án và tìm ra các điểm vướng mắc khó nhất của bài học này.`
      }
      
      ${processMode === "premium" ? "CHÚ Ý: Đây là nội dung chứa công thức phức tạp, hãy phân tích thật sâu vào bản chất logic/định lý." : ""}
      
      ĐỊNH DẠNG BẮT BUỘC: Biến các lỗi/khó khăn đó thành phát biểu của học sinh ở ngôi thứ nhất. Ngắn gọn, dân dã, dưới 15 từ. 
      VD: "Em hay quên đổi dấu", "Em không hiểu bước gộp nghiệm", "Em chưa biết cách kẻ đường cao".
    `,
    buildQuestions: (gaps: string[]) => [
      { id: "q1", type: "single_choice", text: "1. Cảm nhận chung của em về tiết Toán hôm nay?", options: ["A1 – Rất cuốn, thích thú 🤩", "A2 – Bình thường 🙂", "A3 – Hơi ngợp (nhiều công thức/số liệu) 🤯", "A4 – Mệt, khó tập trung 😴"] },
      { id: "q2", type: "single_choice", text: "2. Em tự đánh giá mức độ nắm vững công thức và cách giải?", options: ["B1 – Chưa hiểu (Mất gốc)", "B2 – Mơ hồ (Cần cô/thầy giảng lại)", "B3 – Hiểu cơ bản, làm được bài dễ", "B4 – Hiểu rõ, tự tin xử lý bài khó"] },
      { id: "q3", type: "multi_choice", text: "3. Trong bài này, em gặp khó khăn ở bước tư duy hay phép tính nào nhất?", options: [...gaps, "✅ Em nắm chắc toàn bộ kiến thức, không vướng mắc", "⚡ Thầy/cô tính nhanh quá, em ghi không kịp", "🔊 Lớp ồn / Khó tập trung"] },
      { id: "q4", type: "multi_choice", text: "4. Em muốn thầy/cô điều chỉnh gì để dễ hiểu hơn?", options: ["🐢 Giảng chậm lại ở các bước biến đổi trung gian", "💡 Thêm ví dụ minh họa song song với lý thuyết", "📝 Cô đọng các công thức trọng tâm", "🗣️ Nhắc lại kiến thức cũ trước khi áp dụng"] },
      { id: "q5", type: "multi_choice", text: "5. Cách học nào giúp em tiếp thu Toán tốt nhất?", options: ["📝 Thầy cô giải mẫu chi tiết trên bảng", "✍️ Tự nháp bài ngay tại lớp và được chấm/sửa", "👥 Thảo luận cách giải với bạn cùng bàn", "📖 Có tài liệu sơ đồ tư duy phân loại dạng bài"] },
      { id: "q6", type: "text", text: "6. Lời nhắn ẩn danh:", placeholder: "Có công thức hay bài tập nào em chưa hiểu rõ? Hãy chia sẻ nhé." }
    ]
  },

  // 2. KHỐI XÃ HỘI (NGỮ VĂN)
  "Ngữ văn": {
    buildPrompt: (processMode: string, standards: string) => `
      Bạn là một Chuyên gia Phương pháp giảng dạy Ngữ Văn.
      Nhiệm vụ: Tìm ra 4-5 RÀO CẢN TÂM LÝ, SỰ BÍ Ý TƯỞNG, hoặc KHÓ KHĂN CẢM THỤ mà học sinh thường gặp.

      ${standards 
        ? `🔥 MỤC TIÊU TỐI THƯỢNG: Giáo viên đã chỉ định YÊU CẦU CẦN ĐẠT: "${standards}". Bạn CHỈ TẬP TRUNG tìm ra những điểm nghẽn khiến học sinh KHÔNG THỂ đạt được mục tiêu này. Bỏ qua các chi tiết phụ.` 
        : `🔍 MỤC TIÊU QUÉT RỘNG: Tìm ra các khó khăn chung nhất khi học sinh tiếp cận tác phẩm/kỹ năng trong bài này.`
      }

      ĐỊNH DẠNG BẮT BUỘC: Biến thành phát biểu của học sinh ở ngôi thứ nhất. Ngắn gọn, dưới 15 từ.
      VD: "Em khó đồng cảm với nhân vật", "Em không biết cách lập dàn ý", "Em bị bí từ khi diễn đạt".
    `,
    buildQuestions: (gaps: string[]) => [
      { id: "q1", type: "single_choice", text: "1. Cảm xúc của em sau tiết Văn hôm nay?", options: ["A1 – Rất chạm đến cảm xúc, lôi cuốn ✨", "A2 – Bình thường, dễ nghe 🙂", "A3 – Hơi khô khan, buồn ngủ 🥱", "A4 – Quá trừu tượng, khó cảm nhận 😵‍💫"] },
      { id: "q2", type: "single_choice", text: "2. Em đánh giá mức độ thấu hiểu tác phẩm/bài học của mình?", options: ["B1 – Chưa nắm được cốt truyện/thông điệp", "B2 – Hiểu sương sương, chưa biết cách viết bài", "B3 – Nắm chắc nội dung, nhân vật", "B4 – Hiểu sâu sắc, tự tin phân tích và liên hệ"] },
      { id: "q3", type: "multi_choice", text: "3. Phần nào trong bài làm em thấy 'bí' và khó diễn đạt nhất?", options: [...gaps, "✅ Em đã thấu cảm trọn vẹn và tự tin viết bài", "⚡ Nhịp độ hơi nhanh, em chưa kịp ngấm", "🔊 Không gian chưa đủ yên tĩnh để cảm nhận"] },
      { id: "q4", type: "multi_choice", text: "4. Em muốn thầy/cô điều chỉnh cách dạy thế nào để môn Văn hấp dẫn hơn?", options: ["🗣️ Kể chuyện, mở rộng liên hệ thực tế nhiều hơn", "🎬 Cho xem thêm video/trích đoạn phim minh họa", "📝 Hướng dẫn kỹ các bước lập dàn ý trước khi viết", "👥 Tổ chức tranh biện, diễn kịch, sân khấu hóa"] },
      { id: "q5", type: "multi_choice", text: "5. Hoạt động nào giúp em có cảm hứng học Văn nhất?", options: ["🎧 Nghe cô/thầy bình giảng diễn cảm", "✍️ Tự do viết lách, bày tỏ góc nhìn cá nhân", "🌍 Liên hệ tác phẩm với các trend/vấn đề xã hội hiện tại", "🎨 Vẽ sơ đồ tư duy (Mindmap) hệ thống ý"] },
      { id: "q6", type: "text", text: "6. Lời nhắn ẩn danh:", placeholder: "Em có tâm sự gì về bài học, hay muốn thầy cô hỗ trợ thêm kỹ năng viết bài không?" }
    ]
  },

  // 3. NGOẠI NGỮ (TIẾNG ANH)
  "Tiếng Anh": {
    buildPrompt: (processMode: string, standards: string) => `
      Bạn là một Chuyên gia ngôn ngữ (TESOL/IELTS).
      Nhiệm vụ: Tìm ra 4-5 ĐIỂM NGHẼN NGÔN NGỮ (Language barriers) như từ vựng, ngữ pháp, phát âm, nghe hiểu.

      ${standards 
        ? `🔥 MỤC TIÊU TỐI THƯỢNG: Giáo viên đã chỉ định YÊU CẦU CẦN ĐẠT: "${standards}". Bạn phải phân tích trực diện vào những lỗi sai, rào cản khiến học sinh THẤT BẠI trước mục tiêu ngôn ngữ này.` 
        : `🔍 MỤC TIÊU QUÉT RỘNG: Tìm ra các lỗi sai hoặc điểm nghẽn ngôn ngữ phổ biến nhất trong giáo án này.`
      }

      ĐỊNH DẠNG BẮT BUỘC: Biến thành phát biểu của học sinh ở ngôi thứ nhất. Ngắn gọn, dưới 15 từ.
      VD: "Em hay nhầm thì hiện tại hoàn thành", "Em nghe không kịp audio", "Nhiều từ mới quá em không nhớ nổi".
    `,
    buildQuestions: (gaps: string[]) => [
      { id: "q1", type: "single_choice", text: "1. Mức độ hứng thú của em với tiết Tiếng Anh hôm nay?", options: ["A1 – Rất năng động, vui vẻ 🌟", "A2 – Bình thường 🙂", "A3 – Ngại giao tiếp, sợ nói sai 🤐", "A4 – Theo không kịp, đuối sức 😵"] },
      { id: "q2", type: "single_choice", text: "2. Mức độ nắm vững từ vựng & ngữ pháp của bài?", options: ["B1 – Trống rỗng, không nhớ từ nào", "B2 – Nhớ mang máng nhưng chưa biết cách dùng", "B3 – Hiểu cấu trúc, có thể làm bài tập", "B4 – Nắm rất chắc, tự tin vận dụng vào giao tiếp"] },
      { id: "q3", type: "multi_choice", text: "3. Rào cản lớn nhất của em trong bài này là gì?", options: [...gaps, "✅ Em theo kịp toàn bộ, không gặp khó khăn", "⚡ Thầy/cô nói tiếng Anh nhanh quá", "🙈 Em ngại phát biểu trước lớp"] },
      { id: "q4", type: "multi_choice", text: "4. Em muốn điều chỉnh gì để học Tiếng Anh hiệu quả hơn?", options: ["🐢 Thầy/cô dịch/giải thích tiếng Việt nhiều hơn một chút", "🎮 Tổ chức thêm trò chơi/Flashcard để nhớ từ", "🗣️ Tăng cường thời gian luyện nói (Speaking)", "📝 Chữa bài tập ngữ pháp chi tiết hơn"] },
      { id: "q5", type: "multi_choice", text: "5. Phương pháp học nào giúp em nhớ lâu nhất?", options: ["🎧 Nghe bài hát/Xem video tiếng Anh", "🗣️ Đóng vai (Role-play) giao tiếp với bạn", "✍️ Chép từ vựng và làm bài tập ngữ pháp", "🎮 Chơi các trò chơi tương tác (Kahoot, Quizizz)"] },
      { id: "q6", type: "text", text: "6. Lời nhắn ẩn danh:", placeholder: "Em gặp khó khăn ở kỹ năng nào (Nghe/Nói/Đọc/Viết)? Chia sẻ với thầy cô nhé." }
    ]
  },

  // 4. MẶC ĐỊNH
  "DEFAULT": {
    buildPrompt: (processMode: string, standards: string) => `
      Bạn là Chuyên gia Kiểm định Giáo dục.
      Nhiệm vụ: Tìm ra 4-5 khái niệm hoặc kỹ năng KHÓ NHẤT mà học sinh thường gặp khó khăn.

      ${standards 
        ? `🔥 MỤC TIÊU TỐI THƯỢNG: Giáo viên đã chỉ định YÊU CẦU CẦN ĐẠT: "${standards}". Chỉ phân tích các điểm vướng mắc liên quan trực tiếp đến chuẩn này.` 
        : `🔍 MỤC TIÊU QUÉT RỘNG: Phân tích các nội dung trọng tâm dễ gây nhầm lẫn nhất trong giáo án.`
      }

      ĐỊNH DẠNG BẮT BUỘC: Phát biểu của học sinh, ngôi thứ nhất, ngắn gọn dưới 15 từ. VD: "Em chưa hiểu cách phân loại", "Em không nhớ trình tự các bước".
    `,
    buildQuestions: (gaps: string[]) => [
      { id: "q1", type: "single_choice", text: "1. Cảm nhận chung của em về tiết học hôm nay?", options: ["A1 – Hứng thú 🤩", "A2 – Bình thường 🙂", "A3 – Hơi căng (bài khó/nhanh) 🤯", "A4 – Mệt, khó tập trung 😴"] },
      { id: "q2", type: "single_choice", text: "2. Em tự đánh giá mức độ hiểu bài của mình?", options: ["B1 – Chưa hiểu", "B2 – Mơ hồ (Cần xem lại)", "B3 – Hiểu cơ bản", "B4 – Hiểu rõ, tự tin làm bài"] },
      { id: "q3", type: "multi_choice", text: "3. Trong bài này, em gặp khó khăn ở phần nào nhất?", options: [...gaps, "✅ Em nắm chắc toàn bộ kiến thức", "⚡ Giảng hơi nhanh", "🔊 Khó tập trung"] },
      { id: "q4", type: "multi_choice", text: "4. Em muốn thầy/cô điều chỉnh gì để dễ hiểu hơn?", options: ["🐢 Giảng chậm lại", "💡 Thêm ví dụ minh họa", "📝 Cô đọng kiến thức trọng tâm", "🗣️ Cho thảo luận nhóm"] },
      { id: "q5", type: "multi_choice", text: "5. Cách học nào giúp em tiếp thu tốt nhất?", options: ["📝 Nghe giảng & Ghi chép", "✍️ Làm bài tập tại lớp", "👥 Thảo luận với bạn", "📖 Đọc tài liệu"] },
      { id: "q6", type: "text", text: "6. Lời nhắn ẩn danh:", placeholder: "Có phần nào em chưa hiểu rõ? Hãy chia sẻ nhé." }
    ]
  }
};

SUBJECT_CONFIGS["Vật lý"] = SUBJECT_CONFIGS["Toán học"];
SUBJECT_CONFIGS["Hóa học"] = SUBJECT_CONFIGS["Toán học"];


// =====================================================================
// XỬ LÝ API CHÍNH
// =====================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🚀 LẤY THÊM className VÀ period TỪ FRONTEND GỬI LÊN
    const { content, model = "gpt-5.4", apiKey, standards, processMode, subject, className, period } = body || {};

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    const config = SUBJECT_CONFIGS[subject] || SUBJECT_CONFIGS["DEFAULT"];

    // 🚀 BƯỚC NÂNG CẤP: DỊCH TÊN MODEL TỪ GIAO DIỆN SANG TÊN API THẬT
    let realOpenAIModel = "gpt-4o"; // Mặc định an toàn
    
    if (model === "gpt-4o") {
      realOpenAIModel = "gpt-4o";
    } else if (model === "gpt-4.5") {
      realOpenAIModel = "gpt-4.5-preview"; 
    } else if (model === "gpt-5" || model === "gpt-5.4") {
      realOpenAIModel = "gpt-4o"; // Ép chạy ngầm model mạnh nhất hiện tại để chống sập web
    }

    const systemPrompt = `
      ${config.buildPrompt(processMode, standards)}
      
      YÊU CẦU ĐẦU RA (JSON OBJECT TUYỆT ĐỐI THEO SCHEMA):
      {
        "lesson_title": "Tên bài học ngắn gọn (Tối đa 5-7 từ, KHÔNG tự chế thêm thông tin lớp/tiết vào đây)",
        "dynamic_knowledge_gaps": ["Lỗi/Khó khăn 1", "Lỗi/Khó khăn 2", "Lỗi/Khó khăn 3", "Lỗi/Khó khăn 4"]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: realOpenAIModel, // 🚀 ĐÃ CẬP NHẬT GỌI ĐÚNG BIẾN AN TOÀN
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Nội dung bài dạy:\n${content.substring(0, 15000)}` }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = safeParse(completion.choices[0].message.content || "{}");

    // 🚀 GHÉP CHUỖI TIÊU ĐỀ THÔNG MINH
    // Nếu có tên lớp hoặc tiết, ghép thành format: [12A1 - Tiết 3] Bài tập mặt cầu
    let finalTitle = aiData.lesson_title || `Phản hồi tiết học ${subject || ''}`;
    
    // Chỉ tạo tiền tố nếu có ít nhất 1 trong 2 thông tin
    if (className || period) {
      let prefixParts = [];
      if (className) prefixParts.push(className.trim());
      if (period) prefixParts.push(period.toLowerCase().includes('tiết') ? period.trim() : `Tiết ${period.trim()}`);
      
      const prefix = `[${prefixParts.join(" - ")}]`;
      finalTitle = `${prefix} ${finalTitle}`;
    }

    const survey_v2 = {
      type: `edumirror_${subject || 'standard'}`,
      title: finalTitle,
      questions: config.buildQuestions(aiData.dynamic_knowledge_gaps || [])
    };

    return NextResponse.json({ survey_v2 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}