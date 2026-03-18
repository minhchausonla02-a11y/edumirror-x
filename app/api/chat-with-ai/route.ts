import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 🚀 THÊM THƯ VIỆN GEMINI
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 ĐÃ SỬA: Lấy thêm geminiKey từ giao diện truyền xuống
    const { question, context, apiKey, geminiKey, model = "gpt-4o" } = body;

    const systemPrompt = `
      Bạn là **EduMirror AI** - Trợ lý Sư phạm thông minh.
      Bối cảnh: ${context?.diagnosis || "Không rõ"}
      Giải pháp đã đề xuất: ${context?.currentSolution || "Không rõ"}
      
      Hãy trả lời câu hỏi của giáo viên một cách ngắn gọn, chuyên môn, và đồng cảm.
    `;

    let chatResultText = "";

    // =========================================================
    // NGÃ RẼ 1: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN GEMINI
    // =========================================================
    if (model.startsWith("gemini")) {
      const rawGeminiKey = geminiKey || process.env.GOOGLE_GEMINI_API_KEY || "";
      const finalGeminiKey = rawGeminiKey.trim();

      if (!finalGeminiKey) return NextResponse.json({ error: "Thiếu Google Gemini API Key. Vui lòng cập nhật ở Panel kết nối." }, { status: 401 });

      // 🚀 CHỐT HẠ: Áp dụng chuẩn model 2.5 Paid Tier
      let realGeminiModel = "gemini-2.5-flash"; 
      if (model.includes("pro")) {
          realGeminiModel = "gemini-2.5-pro";
      }

      const genAI = new GoogleGenerativeAI(finalGeminiKey);
      const geminiModel = genAI.getGenerativeModel({ model: realGeminiModel });

      // Gộp Prompt Hệ thống và Câu hỏi của user
      const prompt = `${systemPrompt}\n\nCâu hỏi của giáo viên: ${question}`;

      const result = await geminiModel.generateContent(prompt);
      chatResultText = result.response.text();
    } 
    // =========================================================
    // NGÃ RẼ 2: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN OPENAI (Quy trình cũ)
    // =========================================================
    else {
      const finalKey = apiKey || process.env.OPENAI_API_KEY;
      if (!finalKey) return NextResponse.json({ error: "Thiếu OpenAI API Key" }, { status: 401 });

      const openai = new OpenAI({ apiKey: finalKey });

      let realOpenAIModel = model; 
      if (model === "gpt-4.5") {
        realOpenAIModel = "gpt-4o"; 
      }

      const response = await openai.chat.completions.create({
        model: realOpenAIModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
      });

      chatResultText = response.choices[0].message.content || "";
    }

    return NextResponse.json({ result: chatResultText });

  } catch (error: any) {
    console.error("Chat AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}