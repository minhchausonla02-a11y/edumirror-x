import { NextResponse } from "next/server";

// Cấu hình bắt buộc cho Next.js App Router khi xử lý file
export const runtime = "nodejs"; 
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Cho phép xử lý file nặng trong 60s

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

    // --- 1. XỬ LÝ FILE PDF ---
    if (fileName.endsWith(".pdf")) {
      try {
        // Dùng Dynamic Import để tránh lỗi build trên Vercel
        const pdfModule = (await import("pdf-parse")) as any;
        const pdf = pdfModule.default || pdfModule; // Xử lý default export quái chiêu của thư viện này
        
        const data = await pdf(buffer);
        text = data.text;
      } catch (e) {
        console.error("Lỗi đọc PDF:", e);
        return NextResponse.json({ error: "File PDF bị lỗi hoặc bị mã hóa mật khẩu." }, { status: 500 });
      }
    } 
    
    // --- 2. XỬ LÝ FILE WORD (.docx / .doc) ---
    else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      try {
        const mammothModule = (await import("mammoth")) as any;
        const mammoth = mammothModule.default || mammothModule;

        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
      } catch (e) {
        console.error("Lỗi đọc Word:", e);
        return NextResponse.json({ error: "File Word bị lỗi cấu trúc." }, { status: 500 });
      }
    } 
    
    // --- 3. XỬ LÝ FILE TEXT (.txt) ---
    else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } 
    
    // --- 4. ĐỊNH DẠNG KHÔNG HỖ TRỢ ---
    else {
      return NextResponse.json({ error: "Chỉ hỗ trợ file: .pdf, .docx, .doc, .txt" }, { status: 400 });
    }

    // Kiểm tra kết quả rỗng
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Không đọc được nội dung văn bản từ file này (Có thể file chỉ chứa ảnh)." }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });

  } catch (error: any) {
    console.error("EXTRACT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý file" }, { status: 500 });
  }
}