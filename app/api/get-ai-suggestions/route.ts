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

// Hàm gọi OpenAI
async function callOpenAI(apiKey: string, model: string, inputData: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(inputData) }],
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "OpenAI Error");
  return data.choices[0].message.content;
}

// Hàm gọi Gemini
async function callGemini(apiKey: string, inputData: any) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `${SYSTEM_PROMPT}\n\nDữ liệu đầu vào:\n${JSON.stringify(inputData)}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const { lessonText, analysis, model } = await req.json();
    const apiKey = req.headers.get("x-proxy-key") || process.env.GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    // Tổng hợp dữ liệu (Kết hợp bài học + Dashboard thực tế/giả lập)
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
    if (model.startsWith("gpt")) {
      resultText = await callOpenAI(apiKey, model, inputData);
    } else {
      resultText = await callGemini(apiKey, inputData);
    }

    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    const suggestionData = JSON.parse(cleanJson);

    return NextResponse.json({ suggestion: suggestionData });

  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}