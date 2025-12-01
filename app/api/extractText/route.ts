import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// === POLYFILLS CHO pdf-parse TRÊN VERCEL ===
if (typeof (global as any).navigator === "undefined") {
  (global as any).navigator = { userAgent: "node" };
}

if (typeof (global as any).window === "undefined") {
  (global as any).window = {};
}

if (typeof (global as any).document === "undefined") {
  (global as any).document = {
    createElement: () => ({ getContext: () => null }),
  };
}

if (typeof (global as any).DOMParser === "undefined") {
  (global as any).DOMParser = class DOMParser {};
}

if (typeof (global as any).DOMMatrix === "undefined") {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file nào." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let text = "";

    console.log(`📄 Đang xử lý file: ${fileName}`);

    // === PDF ===
    if (fileName.endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);

        if (!data.text || data.text.trim().length === 0) {
          throw new Error("File PDF không có text (có thể là bản scan).");
        }

        text = data.text;
      } catch (err: any) {
        console.error("PDF ERROR:", err);
        return NextResponse.json(
          { error: "Không đọc được PDF. (Gợi ý: chuyển sang Word rồi upload lại)." },
          { status: 500 }
        );
      }
    }

    // === DOC/DOCX ===
    else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch {
        return NextResponse.json(
          { error: "Không đọc được file Word." },
          { status: 500 }
        );
      }
    }

    // === TXT ===
    else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ .pdf, .docx, .doc, .txt" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
