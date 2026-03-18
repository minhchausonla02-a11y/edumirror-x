import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
Bạn là "EduMirror X" - Trợ lý Kiến tạo Sư phạm cao cấp. 
Nhiệm vụ: Phân tích dữ liệu lớp học và TẠO RA VẬT PHẨM DẠY HỌC CỤ THỂ (Generative Content) để giáo viên dùng ngay.

Đầu vào:
1. Nội dung bài học (Lesson Content).
2. Dữ liệu thống kê từ Dashboard (Analysis).

Hãy trả về JSON (không markdown) theo cấu trúc 3 tầng sau:
{
  "gap_analysis": {
    "title": "Soi gương thực tế",
    "teacher_intent": "Nhận định mục tiêu của giáo viên (VD: Chú trọng lý thuyết định nghĩa).",
    "student_reality": "Thực tế tiếp thu của HS (VD: Hổng kiến thức vận dụng thực tế).",
    "insight": "Kết luận về độ lệch (VD: Cần giảm bớt 15p lý thuyết để tăng thời gian làm bài tập mẫu)."
  },
  "rescue_kit": [
    {
      "type": "metaphor",
      "title": "Ví dụ ẩn dụ (Giải thích khái niệm khó)",
      "content": "Để giải thích [Khái niệm X], hãy so sánh với [Hình ảnh đời sống]..."
    },
    {
      "type": "mistake_fix",
      "title": "Gỡ rối lỗi sai thường gặp",
      "content": "- Lỗi sai: [Mô tả lỗi]\n- Cách sửa nhanh: [Mẹo nhớ]..."
    },
    {
      "type": "exercise",
      "title": "Bài tập 'mồi' (Scaffolding)",
      "content": "Bài 1 (Dễ): ... \n Bài 2 (Trung bình): ..."
    }
  ],
  "emotional_script": {
    "mood_detected": "Trạng thái lớp (VD: Căng thẳng / Mất tập trung)",
    "activity_name": "Hoạt động điều phối (VD: Kỹ thuật Pomodoro / Trò chơi nhỏ)",
    "script_content": "Giáo viên nói: 'Thầy biết phần vừa rồi hơi "khoai", hít sâu nào... Bây giờ chúng ta sẽ chơi một trò chơi nhỏ trong 2 phút nhé...'"
  }
}
`;

// Hàm parse JSON an toàn
function safeParse(text: string) {
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      return JSON.parse(cleanText.substring(startIndex, endIndex + 1));
    }
    return {};
  } catch (e) {
    console.error("Lỗi trích xuất JSON:", e);
    return {};
  }
}

// Hàm gọi OpenAI
async function callOpenAI(apiKey: string, model: string, inputData: any) {
  let realModel = model;
  if (model === "gpt-4.5") realModel = "gpt-4o";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: realModel,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(inputData) }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "OpenAI Error");
  return data.choices[0].message.content;
}

// Hàm gọi Gemini (🚀 Đã sửa chuẩn 2.5 Flash)
async function callGemini(apiKey: string, modelName: string, inputData: any) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // 🚀 Dùng biến modelName truyền từ Frontend xuống (mặc định sẽ là gemini-2.5-flash)
  const geminiModel = genAI.getGenerativeModel({ model: modelName });
  const prompt = `${SYSTEM_PROMPT}\n\nDữ liệu đầu vào:\n${JSON.stringify(inputData)}`;
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const { lessonText, analysis, model = "gpt-5.4", apiKey } = await req.json();

    // 🚀 Đồng bộ chuẩn API Key từ Frontend hoặc Biến môi trường
    let finalKey = apiKey;
    if (!finalKey) {
       if (model.startsWith("gemini")) finalKey = process.env.GOOGLE_GEMINI_API_KEY;
       else finalKey = process.env.OPENAI_API_KEY;
    }

    if (!finalKey) return NextResponse.json({ error: `Thiếu API Key cho mô hình ${model}` }, { status: 401 });

    // Tổng hợp dữ liệu
    const inputData = {
      lesson_content: lessonText ? lessonText.slice(0, 4000) : "Chưa có nội dung chi tiết",
      dashboard_stats: analysis || {
        understanding_rate: "Trung bình khá",
        top_weakness: "Khái niệm trừu tượng",
        dominant_emotion: "Hơi mệt mỏi",
        student_feedback_summary: "Cần thêm ví dụ dễ hiểu hơn."
      }
    };

    let resultText = "";
    if (model.startsWith("gemini")) {
      // 🚀 Gọi Gemini với đúng Key và Model mới nhất
      resultText = await callGemini(finalKey, model, inputData);
    } else {
      resultText = await callOpenAI(finalKey, model, inputData);
    }

    const suggestionData = safeParse(resultText);

    return NextResponse.json({ suggestion: suggestionData });

  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}