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

  standards?: Array<{
    code: string;
    descriptor: string;
    bloom: string;
    competency: string;
    alignment_score: number;
    evidence_items: string[];
    assessment_items: string[];
  }>;
  success_criteria?: string[];
  rubric?: Array<{
    criterion: string;
    levels: { M4: string; M3: string; M2: string; M1: string };
  }>;
  misalignment?: string[];
  recommendations?: string[];
};

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
    throw new Error("INVALID_JSON_OUTPUT");
  }
}

export async function POST(req: Request) {
  try {
    // 1. Đọc body request
    const body = await req.json();
    const {
      content,
      model = "gpt-4o-mini",
      ktknEnabled = false,
      ktknText = "",
      subject = "Toán",
      grade = "THPT",
    } = body || {};

    if (!content || String(content).trim().length < 50) {
      return NextResponse.json(
        { error: "Nội dung giáo án quá ngắn" },
        { status: 400 }
      );
    }

    // 2. Lấy API key (ưu tiên proxy key trên header)
    const headerKey = req.headers.get("x-proxy-key");
    const finalKey = headerKey || process.env.OPENAI_API_KEY;

    if (!finalKey) {
      return NextResponse.json({ error: "Thiếu API Key" }, { status: 401 });
    }

    const client = new OpenAI({ apiKey: finalKey });

    // 3. Schema mô tả cấu trúc JSON mong muốn (dùng cho prompt)
    const baseSchema = `
{
  "outline": [],
  "objectives": [],
  "key_concepts": [],
  "common_misconceptions": [],
  "pacing_flags": [],
  "survey_items": {
    "knowledge": [],
    "metacognition": [],
    "pace": []
  },
  "quiz": {
    "multiple_choice": []
  }
}`;

    const ktknSchema = `,
  "standards": [],
  "success_criteria": [],
  "rubric": [],
  "misalignment": [],
  "recommendations": []
}`;

    const schema = ktknEnabled
      ? baseSchema.replace("}", ktknSchema)
      : baseSchema;

    const ktknBlock = ktknEnabled
      ? `--- KHUNG KT-KN ---
Môn: ${subject} | Cấp: ${grade}
${ktknText || ""}
`
      : "";

    // 4. Prompt gửi cho AI
    const prompt = `
Bạn là trợ lý sư phạm chuyên nghiệp. Hãy phân tích giáo án sau và trả về DUY NHẤT MỘT JSON theo đúng SCHEMA:

SCHEMA:
${schema}

${ktknBlock}

--- NỘI DUNG GIÁO ÁN ---
${content.substring(0, 15000)}
`.trim();

    // 5. Gọi OpenAI bằng API responses (tương thích GPT-5.1, 5.1-mini, 4o, 4o-mini)
    const ai = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: "Bạn là AI chỉ trả về JSON hợp lệ, không giải thích thêm.",
        },
        { role: "user", content: prompt },
      ],
    });

    // 6. Chuẩn hóa output cho mọi model
    let raw = "";

    // GPT-4o, GPT-4o-mini
    if ((ai as any).output_text) {
      raw = (ai as any).output_text;
    }
    // GPT-5.1, GPT-5.1-mini
    else if ((ai as any).output?.[0]?.content?.[0]?.text) {
      raw = (ai as any).output[0].content[0].text;
    }
    // Fallback: stringify toàn bộ để dễ debug
    else {
      raw = JSON.stringify(ai, null, 2);
    }

    const result = safeParse(raw) as AnalyzeResult;
    return NextResponse.json({ result });
  } catch (e: any) {
    console.error("ANALYZE_ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Lỗi phân tích giáo án" },
      { status: 500 }
    );
  }
}
