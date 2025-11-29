import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MC = { q: string; choices: string[]; answer: string };

type AnalyzeResult = {
  outline: string[];
  objectives: string[];
  key_concepts: string[];
  common_misconceptions: string[];
  pacing_flags: string[];
  survey_items: { knowledge: string[]; metacognition: string[]; pace: string[] };
  quiz: { multiple_choice: MC[] };

  // === KT–KN (Chuẩn kiến thức kỹ năng) ===
  standards?: Array<{
    code: string;
    descriptor: string;
    bloom: "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create";
    competency: string;
    alignment_score: number;
    evidence_items: string[];
    assessment_items: string[];
  }>;
  success_criteria?: string[];
  rubric?: Array<{
    criterion: string; levels: { M4:string; M3:string; M2:string; M1:string };
  }>;
  misalignment?: string[];
  recommendations?: string[];
};

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    // 1. Lấy body (Sửa lỗi thiếu khai báo body)
    const body = await req.json();
    const {
      content,
      model = "gpt-4o-mini", // Lấy model từ body, mặc định gpt-4o-mini
      ktknEnabled = false,
      ktknText = "",
      subject = "Toán",
      grade = "THPT"
    } = body || {};

    if (!content || String(content).trim().length < 50) {
      return NextResponse.json({ error: "Nội dung giáo án quá ngắn" }, { status: 400 });
    }

    // 2. Lấy API Key
    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) {
      return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });
    }

    const client = new OpenAI({ apiKey: finalKey });

    // 3. Chuẩn bị Schema
    const baseSchema = `
{
  "outline": string[],
  "objectives": string[],
  "key_concepts": string[],
  "common_misconceptions": string[],
  "pacing_flags": string[],
  "survey_items": { "knowledge": string[], "metacognition": string[], "pace": string[] },
  "quiz": { "multiple_choice": [ { "q": string, "choices": string[], "answer": "A"|"B"|"C"|"D" } ] }
}`;

    const ktknSchema = `
,
  "standards": [
    {
      "code": string,
      "descriptor": string,
      "bloom": "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create",
      "competency": string,
      "alignment_score": number,
      "evidence_items": string[],
      "assessment_items": string[]
    }
  ],
  "success_criteria": string[],
  "rubric": [
    { "criterion": string, "levels": { "M4":"Xuất sắc", "M3":"Đạt", "M2":"Cần cố gắng", "M1":"Chưa đạt" } }
  ],
  "misalignment": string[],
  "recommendations": string[]`;

    const schema = ktknEnabled ? baseSchema.replace(/\}$/, ktknSchema + "\n}") : baseSchema;

    const ktknBlock = ktknEnabled
      ? `
--- KHUNG CHUẨN KT–KN ---
Môn: ${subject}; Cấp: ${grade}
${ktknText?.trim() || "(Nếu không có văn bản chuẩn cục bộ, hãy tự suy ra chuẩn phù hợp theo CTGDPT 2018 và nêu rõ mã/nhãn chuẩn tự đặt.)"}

YÊU CẦU BẮT BUỘC:
- Mapping từng chuẩn: code, descriptor, Bloom, competency, alignment_score (0–1), evidence_items, assessment_items.
- Đưa "success_criteria" (ngôn ngữ học sinh) và "rubric" 4 mức.
- Nêu "misalignment" và "recommendations" nếu thấy thiếu bằng chứng hoặc mục tiêu chưa khớp.
`
      : "";

    // 4. Prompt
    const prompt = `
Bạn là trợ lý sư phạm chuyên nghiệp. Hãy phân tích giáo án sau và trả về DUY NHẤT một JSON hợp lệ theo cấu trúc dưới đây.

SCHEMA:
${schema}

HƯỚNG DẪN:
- Ngôn ngữ: Tiếng Việt.
- "quiz": Tạo 6-10 câu trắc nghiệm khách quan.
${ktknBlock}

--- NỘI DUNG GIÁO ÁN ---
${content.substring(0, 15000)}
`.trim();

    // 5. Gọi OpenAI (Dùng chat.completions chuẩn)
    const completion = await client.chat.completions.create({
      model: model, // Dùng biến model lấy từ body
      messages: [
        { role: "system", content: "Bạn là một AI trả về JSON." },
        { role: "user", content: prompt }
      ],
    
      response_format: { type: "json_object" } // Ép trả về JSON chuẩn
    });

    const rawContent = completion.choices[0].message.content || "{}";
    const result = safeParse(rawContent) as AnalyzeResult;

    return NextResponse.json({ result });

  } catch (e: any) {
    console.error("ANALYZE_ERROR:", e);
    return NextResponse.json({ error: e.message || "Lỗi phân tích giáo án" }, { status: 500 });
  }
}