// app/api/generate-survey/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { BANK_DEFAULT, buildSurveyFromBank, SurveyV2, LessonAnalysisLite } from "@/data/surveyBank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeParse(text: string) {
  try { return JSON.parse(text); }
  catch {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a>=0 && b>a) return JSON.parse(text.slice(a, b+1));
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      content,                 // văn bản giáo án (đã có)
      model = "gpt-4o-mini",
      subject = "THPT",
      analysis,                // { objectives, key_concepts, common_misconceptions }
      aiFallback = true,       // cho phép fallback AI nếu thiếu
    } = body || {};

    if (!content || String(content).trim().length < 30)
      return NextResponse.json({ error: "NO_CONTENT" }, { status: 400 });

    // 1) Tạo từ BANK + phân tích
    const surveyFromBank = buildSurveyFromBank(analysis as LessonAnalysisLite, subject);

    // 2) Nếu đã đủ (luôn đủ 6 mục) thì trả luôn — nhanh, rẻ, ổn định
    if (!aiFallback) return NextResponse.json({ survey_v2: surveyFromBank });

    // 3) Fallback AI (chỉ để "làm đẹp câu chữ" theo ngữ cảnh tiết học)
    const apiKey = req.headers.get("x-proxy-key") || process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "NO_KEY" }, { status: 400 });
    const client = new OpenAI({ apiKey });

    const prompt = `
Bạn là trợ lý sư phạm THPT. Dựa trên BÀI HỌC và MẪU PHIẾU dưới đây,
hãy viết lại **nhãn câu hỏi** (label) ngắn gọn, tránh thuật ngữ, giữ đúng cấu trúc item/type/options/choices,
không thêm bớt mục, không đổi id.

--- BÀI HỌC ---
${content}

--- MẪU PHIẾU (JSON) ---
${JSON.stringify(surveyFromBank)}

Yêu cầu: Trả về JSON **y nguyên cấu trúc** như MẪU PHIẾU (chỉ thay label nếu cần), không thêm văn bản ngoài JSON.
`.trim();

    const r = await client.responses.create({ model, temperature: 0.2, input: prompt });
    const json = safeParse(r.output_text) as SurveyV2;

    // Nếu AI lỗi / không hợp lệ -> dùng bản BANK
    const ok = json?.items?.length === 6;
    return NextResponse.json({ survey_v2: ok ? json : surveyFromBank });
  } catch (e: any) {
    console.error("GEN_SURVEY_ERROR:", e);
    return NextResponse.json({ error: e.message || "GEN_SURVEY_ERROR" }, { status: 500 });
  }
}
