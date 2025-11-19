import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// Prompt chuyên gia sư phạm EduMirror X
const SYSTEM_PROMPT = `
Bạn là "EduMirror X" - Trợ lý AI chuyên sâu về phương pháp sư phạm. 
Nhiệm vụ: Phân tích dữ liệu lớp học và đưa ra chiến lược điều chỉnh dạy học cụ thể.

Dựa trên Thư viện gợi ý mẫu (R01-R10), hãy trả về kết quả JSON (không markdown) theo cấu trúc:
{
  "diagnosis": {
    "summary": "Nhận định tổng quan tình hình lớp (VD: Lớp đang bị quá tải kiến thức...)",
    "mood": "Cảm xúc chủ đạo (Hứng thú / Lo lắng / Mệt mỏi)",
    "urgent_issue": "Vấn đề cấp bách nhất cần xử lý ngay"
  },
  "strategies": [
    {
      "code": "Mã gợi ý (VD: R01, R02...)",
      "title": "Tên chiến lược (VD: Giảm tốc độ & Chia nhỏ nội dung)",
      "action": "Hành động cụ thể giáo viên cần làm trong 5 phút đầu tiết sau.",
      "reason": "Tại sao chọn cách này? (Dựa trên dữ liệu nào)"
    },
    {
      "code": "R05",
      "title": "Hoạt động củng cố kiến thức",
      "action": "...",
      "reason": "..."
    }
  ],
  "suggested_activity": {
    "name": "Tên hoạt động đề xuất (VD: Trò chơi 'Ai nhanh hơn')",
    "steps": ["Bước 1...", "Bước 2...", "Bước 3..."]
  }
}
`;

// Hàm gọi OpenAI
async function callOpenAI(apiKey: string, model: string, lessonInfo: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Dữ liệu đầu vào:\n${JSON.stringify(lessonInfo)}` },
      ],
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "OpenAI Error");
  return data.choices[0].message.content;
}

// Hàm gọi Gemini
async function callGemini(apiKey: string, lessonInfo: any) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `${SYSTEM_PROMPT}\n\nDữ liệu phân tích:\n${JSON.stringify(lessonInfo)}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const { lessonText, analysis, model } = await req.json();
    // Lấy Key từ Header để đảm bảo hoạt động với cả GPT/Gemini
    const apiKey = req.headers.get("x-proxy-key") || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    // Tổng hợp thông tin gửi cho AI
    const lessonInfo = {
      context: "Đây là dữ liệu sau tiết học.",
      lesson_content: lessonText ? lessonText.slice(0, 3000) : "Không có nội dung chi tiết",
      key_points: analysis || "Chưa có phân tích chuyên sâu",
      // Giả lập dữ liệu Dashboard nếu chưa có kết nối DB thực tế (Để Demo gây ấn tượng)
      simulated_stats: {
        understanding: "60% hiểu bài, 40% còn mơ hồ",
        pace: "Hơi nhanh so với khả năng tiếp thu",
        top_weakness: "Vận dụng công thức vào bài tập",
        student_feedback: ["Thầy giảng hơi nhanh đoạn đầu", "Cần thêm ví dụ thực tế"]
      }
    };

    let resultText = "";
    if (model.startsWith("gpt")) {
      resultText = await callOpenAI(apiKey, model, lessonInfo);
    } else {
      resultText = await callGemini(apiKey, lessonInfo);
    }

    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    const suggestionData = JSON.parse(cleanJson);

    return NextResponse.json({ suggestion: suggestionData });

  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}