import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 NHẬN THÊM "history" TỪ FRONTEND
    const { question, history = [], context, apiKey, geminiKey, model = "gpt-4o" } = body;

    // 🚀 LẮP ĐỒNG HỒ THỜI GIAN THỰC (Giờ Việt Nam)
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    const systemPrompt = `
      Bạn là **EduMirror AI** - Trợ lý Sư phạm thông minh.
      Hôm nay là: ${now} (Giờ Việt Nam). Nếu được hỏi về thời gian, hãy dùng thông tin này.
      
      Bối cảnh lớp học: ${context?.diagnosis || "Không rõ"}
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

      if (!finalGeminiKey) return NextResponse.json({ error: "Thiếu Google Gemini API Key." }, { status: 401 });

      let realGeminiModel = "gemini-2.5-flash"; 
      if (model.includes("pro")) {
          realGeminiModel = "gemini-2.5-pro";
      }

      const genAI = new GoogleGenerativeAI(finalGeminiKey);
      const geminiModel = genAI.getGenerativeModel({ model: realGeminiModel });

      // 🚀 NỐI LỊCH SỬ CHAT VÀO PROMPT CHO GEMINI HIỂU NGỮ CẢNH
      let conversationText = "";
      if (history.length > 0) {
          conversationText = "Lịch sử trò chuyện trước đó:\n" + history.map((h: any) => `${h.role === 'user' ? 'Giáo viên' : 'AI'}: ${h.content}`).join("\n") + "\n\n";
      }

      const prompt = `${systemPrompt}\n\n${conversationText}Câu hỏi hiện tại của giáo viên: ${question}`;

      const result = await geminiModel.generateContent(prompt);
      chatResultText = result.response.text();
    } 
    // =========================================================
    // NGÃ RẼ 2: XỬ LÝ NẾU NGƯỜI DÙNG CHỌN OPENAI
    // =========================================================
    else {
      const finalKey = apiKey || process.env.OPENAI_API_KEY;
      if (!finalKey) return NextResponse.json({ error: "Thiếu OpenAI API Key" }, { status: 401 });

      const openai = new OpenAI({ apiKey: finalKey });

      let realOpenAIModel = model; 
      if (model === "gpt-4.5") {
        realOpenAIModel = "gpt-4o"; 
      }

      // 🚀 CHUYỂN ĐỔI LỊCH SỬ CHAT SANG ĐỊNH DẠNG MESSAGES CỦA OPENAI
      const openAIMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((h: any) => ({
           role: h.role === 'ai' ? 'assistant' : 'user',
           content: h.content
        })),
        { role: "user", content: question }
      ];

      const response = await openai.chat.completions.create({
        model: realOpenAIModel,
        messages: openAIMessages,
      });

      chatResultText = response.choices[0].message.content || "";
    }

    return NextResponse.json({ result: chatResultText });

  } catch (error: any) {
    console.error("Chat AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}