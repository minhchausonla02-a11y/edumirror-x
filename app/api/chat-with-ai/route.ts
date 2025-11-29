import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 👇 LẤY MODEL (Mặc định gpt-4o cho chat)
    const { question, context, apiKey, model = "gpt-4o" } = body;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    const systemPrompt = `
      Bạn là **EduMirror AI** - Trợ lý Sư phạm thông minh.
      Bối cảnh: ${context?.diagnosis || "Không rõ"}
      Giải pháp đã đề xuất: ${context?.currentSolution || "Không rõ"}
      
      Hãy trả lời câu hỏi của giáo viên một cách ngắn gọn, chuyên môn, và đồng cảm.
    `;

    const response = await openai.chat.completions.create({
      model: model, // 👈 QUAN TRỌNG: Dùng biến model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      
    });

    return NextResponse.json({ result: response.choices[0].message.content });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}