import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ✅ BỔ SUNG: OPTIONS để tránh 405 trong các trường hợp preflight/proxy
export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

// ✅ BỔ SUNG: GET để bạn mở trực tiếp /api/analyze-premium trên trình duyệt để test "route sống"
export async function GET() {
  return NextResponse.json(
    { ok: true, message: "analyze-premium route is alive. Use POST with FormData." },
    { status: 200 }
  );
}

function pickMathLines(text: string, limit = 120) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Các dấu hiệu “có công thức”
  const mathRegex =
    /[=<>±√∫∑π∞≠≈≤≥°]|(\b(sin|cos|tan|log|ln|lim)\b)|(\^|_|\\frac|\/)|(\b\d+[.,]?\d*\b)/i;

  const picked: string[] = [];
  for (const l of lines) {
    // Ưu tiên dòng ngắn vừa + có ký hiệu toán
    if (mathRegex.test(l) && l.length <= 160) picked.push(l);
    if (picked.length >= limit) break;
  }
  return picked.join("\n");
}

function compressText(text: string, maxChars = 12000) {
  const t = text.replace(/\r/g, "").trim();
  if (t.length <= maxChars) return { compressed: t, truncated: false };

  const head = t.slice(0, 4500);
  const tail = t.slice(-2500);
  const mid = t.slice(4500, -2500);

  // Lấy các dòng “cấu trúc”
  const lines = mid.split("\n").map((l) => l.trim());
  const structure = lines
    .filter(
      (l) =>
        /^(\d+[\.\)]\s+|[IVX]+\.\s+|[-*•]\s+)/.test(l) ||
        /(mục tiêu|hoạt động|khởi động|hình thành|luyện tập|vận dụng|củng cố|đánh giá|bài tập|ví dụ|định lý|công thức)/i.test(
          l
        )
    )
    .slice(0, 120)
    .join("\n");

  const compressed = `=== ĐẦU ===\n${head}\n\n=== CẤU TRÚC (lọc) ===\n${structure}\n\n=== CUỐI ===\n${tail}`;

  return { compressed: compressed.slice(0, maxChars), truncated: true };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subject = (formData.get("subject") as string) || "Toán học";
    const grade = (formData.get("grade") as string) || "Lớp 10";
    const apiKey = (formData.get("apiKey") as string) || "";
    const model = (formData.get("model") as string) || "gpt-4o-mini";

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalKey) {
      return NextResponse.json({ error: "Thiếu API Key OpenAI" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "Chế độ Cao cấp cần upload file." }, { status: 400 });
    }

    // 1) Đọc file sang text (nhanh)
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let text = "";

    if (fileName.endsWith(".pdf")) {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      text = data.text || "";
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json({ error: "Chỉ hỗ trợ .pdf, .docx, .doc, .txt" }, { status: 400 });
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: "Không đọc được nội dung (PDF có thể là bản scan). Hãy dùng Word hoặc dán thêm công thức." },
        { status: 400 }
      );
    }

    // 2) Trích dòng công thức “gợi ý” cho AI
    const mathHints = pickMathLines(text, 120);

    // 3) Rút gọn để chạy dưới 60s
    const { compressed, truncated } = compressText(text, 12000);

    // 4) Gọi AI (có timeout nội bộ)
    const client = new OpenAI({ apiKey: finalKey });

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 55_000);

    const prompt = `
Bạn là trợ lý sư phạm THPT. Hãy phân tích giáo án ${subject} ${grade}.
Đây là CHẾ ĐỘ CAO CẤP: chú trọng công thức/ký hiệu và bước suy luận.

NHIỆM VỤ:
- Tóm tắt mục tiêu & cấu trúc bài.
- Nêu 5-10 "điểm mù" HS hay sai (đặc biệt quanh công thức/ký hiệu).
- Gợi ý câu hỏi kiểm tra nhanh + sinh khảo sát 60s (MCQ + thang đo + câu mở).

TRẢ VỀ JSON THUẦN theo schema:
{
  "result": {
    "summary": string,
    "objectives": string[],
    "outline": string[],
    "key_concepts": string[],
    "likely_misconceptions": string[],
    "hard_steps": string[],
    "pacing": string[],
    "survey_60s": {
      "mcq": { "q": string, "choices": string[] }[],
      "rating": { "q": string, "scale": string[] }[],
      "free_text": { "q": string }[]
    },
    "notes": { "truncated_input": boolean }
  }
}

GỢI Ý CÔNG THỨC/KÝ HIỆU TRÍCH TỪ FILE:
${mathHints || "(không trích được dòng công thức rõ ràng)"}

NỘI DUNG GIÁO ÁN (đã rút gọn):
${compressed}
`.trim();

    const resp = await client.responses.create({
      model,
      input: prompt,
      max_output_tokens: 900,
      // @ts-ignore
      signal: ac.signal,
    });

    clearTimeout(timer);

    const outText = (resp as any).output_text || "";

    // Parse JSON an toàn
    let parsed: any = null;
    try {
      parsed = JSON.parse(outText);
    } catch {
      const m = outText.match(/\{[\s\S]*\}$/);
      if (m) parsed = JSON.parse(m[0]);
    }

    if (!parsed?.result) {
      return NextResponse.json(
        { error: "AI trả về không đúng JSON", raw_preview: outText.slice(0, 400) },
        { status: 502 }
      );
    }

    parsed.result.notes = parsed.result.notes || {};
    parsed.result.notes.truncated_input = truncated;

    return NextResponse.json(parsed);
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "Cao cấp bị cắt do gần chạm giới hạn thời gian. Hãy dùng file ngắn hơn hoặc giảm nội dung."
        : err?.message || "Premium analyze failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
