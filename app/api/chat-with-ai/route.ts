import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, context, apiKey } = body;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });

    const openai = new OpenAI({ apiKey: finalKey });

    const systemPrompt = `
      Bạn là Trợ lý Sư phạm chuyên nghiệp của EduMirror.
      
      BỐI CẢNH VẤN ĐỀ LỚP HỌC:
      ${context?.diagnosis || "Chưa có dữ liệu"}

      GIẢI PHÁP ĐÃ ĐỀ XUẤT:
      ${context?.currentSolution || "Chưa có dữ liệu"}

      NHIỆM VỤ:
      Trả lời câu hỏi tiếp theo của giáo viên một cách ngắn gọn, đi thẳng vào trọng tâm sư phạm.
      Nếu giáo viên hỏi chi tiết về một kỹ thuật dạy học, hãy giải thích rõ ràng.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      temperature: 0.7,
    });

    return NextResponse.json({ result: response.choices[0].message.content });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}