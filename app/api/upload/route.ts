import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Thiếu file" }, { status: 400 });

    const name = (file.name || "file").toLowerCase();
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    let text = "";

    if (name.endsWith(".txt")) {
      text = buf.toString("utf8");
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.default.extractRawText({ buffer: buf });
      text = result.value || "";
   } else if (name.endsWith(".pdf")) {
  // Fix import pdf-parse cho TypeScript/Vercel
  const pdfModule = (await import("pdf-parse")) as any;
  const pdfParse = pdfModule.default || pdfModule;
  const data = await pdfParse(buf as any);
  text = data.text || "";
} else if (name.endsWith(".doc")) {

      return NextResponse.json(
        { error: "Tệp .doc (cũ) chưa hỗ trợ. Vui lòng 'Save As' sang .docx rồi tải lại." },
        { status: 415 }
      );
    } else {
      return NextResponse.json(
        { error: "Định dạng chưa hỗ trợ. Hãy dùng .docx, .pdf hoặc .txt" },
        { status: 415 }
      );
    }

    text = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    return NextResponse.json({ name: file.name, size: file.size, chars: text.length, text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload lỗi" }, { status: 500 });
  }
}
