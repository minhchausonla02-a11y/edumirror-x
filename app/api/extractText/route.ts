// app/api/extractText/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const lower = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());

    let text = "";
    if (lower.endsWith(".txt")) {
      text = buf.toString("utf-8");
    } else if (lower.endsWith(".pdf")) {
  // Fix import pdf-parse cho TypeScript/Vercel
  const pdfModule = (await import("pdf-parse")) as any;
  const pdf = pdfModule.default || pdfModule;
  const out = await pdf(buf as any);
  text = out.text || "";
} else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {

      const { default: mammoth } = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: buf });
      text = out.value || "";
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "extract-error" }, { status: 500 });
  }
}
