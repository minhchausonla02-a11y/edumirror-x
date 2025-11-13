// app/api/analyze/route.ts
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

  // === KT–KN (mới) ===
  standards?: Array<{
    code: string;                  // ví dụ: T10-VE-1.1 hoặc “NL toán 1.2”
    descriptor: string;            // mô tả chuẩn
    bloom: "Remember"|"Understand"|"Apply"|"Analyze"|"Evaluate"|"Create";
    competency: string;            // NL/PC theo CT 2018 (ví dụ: NL giải quyết vấn đề, Giao tiếp toán học…)
    alignment_score: number;       // 0–1: độ khớp giữa giáo án và chuẩn
    evidence_items: string[];      // bằng chứng trong giáo án
    assessment_items: string[];    // gợi ý câu hỏi/hoạt động đánh giá chuẩn đó
  }>;
  success_criteria?: string[];     // tiêu chí thành công cho HS (student-friendly)
  rubric?: Array<{
    criterion: string; levels: { M4:"Xuất sắc"; M3:"Đạt"; M2:"Cần cố gắng"; M1:"Chưa đạt" };
  }>;
  misalignment?: string[];         // chỗ lệch chuẩn / thiếu minh chứng
  recommendations?: string[];      // điều chỉnh cụ thể
};

// Parse an toàn JSON
function safeParse(text: string) {
  try { return JSON.parse(text); } catch {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b+1));
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      content,
      model = "gpt-4o-mini",
      ktknEnabled = false,
      ktknText = "",
      subject = "Toán",
      grade = "THPT"
    } = body || {};

    if (!content || String(content).trim().length < 50) {
      return NextResponse.json({ error: "NO_CONTENT" }, { status: 400 });
    }

    const apiKey = req.headers.get("x-proxy-key") || process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "NO_KEY" }, { status: 400 });

    const client = new OpenAI({ apiKey });

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

    const prompt = `
Bạn là trợ lý sư phạm cho lớp đông (40–50 HS). Hãy PHẢN HỒI DUY NHẤT bằng một đối tượng JSON hợp lệ đúng schema dưới đây (không có giải thích ngoài JSON).

SCHEMA:
${schema}

HƯỚNG DẪN CHUNG:
- Ngôn ngữ: tiếng Việt ngắn gọn, chính xác.
- "quiz.multiple_choice": 6–10 câu, mỗi câu 4 lựa chọn A–D, answer là chữ cái.
${ktknBlock}

--- NỘI DUNG GIÁO ÁN ---
${content}
`.trim();

    const r = await client.responses.create({
      model,
      input: prompt,
      temperature: 0.2,
    });

    const result = safeParse(r.output_text) as AnalyzeResult;
    return NextResponse.json({ result });
  } catch (e: any) {
    console.error("ANALYZE_ERROR:", e);
    return NextResponse.json({ error: e.message || "ANALYZE_ERROR" }, { status: 500 });
  }
}
