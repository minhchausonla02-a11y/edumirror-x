import { NextResponse } from "next/server";

// Cấu hình bắt buộc
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; 

// --- POLYFILL ĐỂ SỬA LỖI DOMMATRIX ---
// (Giả lập DOMMatrix cho môi trường Node.js nếu chưa có)
if (typeof global.DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        public a = 1; public b = 0; public c = 0; public d = 1; public e = 0; public f = 0;
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

    console.log(`📂 Đang xử lý file: ${fileName}, Kích thước: ${buffer.length} bytes`);

    // --- 1. XỬ LÝ FILE PDF ---
    if (fileName.endsWith(".pdf")) {
      try {
        // Dùng require thay vì import để đảm bảo thứ tự chạy sau Polyfill
        const pdfParse = require("pdf-parse");
        
        const data = await pdfParse(buffer);
        text = data.text;
        
        if (!text || text.trim().length === 0) {
           throw new Error("File PDF rỗng hoặc là file ảnh scan (không có text).");
        }
      } catch (e: any) {
        console.error("❌ Lỗi chi tiết đọc PDF:", e);
        // Gợi ý giải pháp nếu lỗi vẫn xảy ra
        return NextResponse.json({ 
            error: `Không đọc được PDF. Lỗi: ${e.message}. (Thử chuyển file sang Word rồi upload lại)` 
        }, { status: 500 });
      }
    } 
    
    // --- 2. XỬ LÝ FILE WORD (.docx / .doc) ---
    else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
      } catch (e: any) {
        console.error("❌ Lỗi đọc Word:", e);
        return NextResponse.json({ error: "File Word bị lỗi cấu trúc." }, { status: 500 });
      }
    } 
    
    // --- 3. XỬ LÝ FILE TEXT ---
    else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } 
    
    else {
      return NextResponse.json({ error: "Định dạng file không hỗ trợ. Chỉ nhận .pdf, .docx, .txt" }, { status: 400 });
    }

    // Trả về kết quả
    return NextResponse.json({ text: text.trim() });

  } catch (error: any) {
    console.error("🚨 EXTRACT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống xử lý file" }, { status: 500 });
  }
}