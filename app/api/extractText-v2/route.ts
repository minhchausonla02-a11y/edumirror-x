import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fileUrl, fileName } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Thiếu fileUrl" }, { status: 400 });
    }

    const apiKey = process.env.LLAMAPARSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chưa cấu hình API Key cho LlamaParse" }, { status: 500 });
    }

    // 1. Kéo file từ kho Supabase về Server để chuẩn bị phân tích
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error("Không thể đọc file từ Supabase");
    const fileBlob = await fileRes.blob();

    // 2. Đóng gói file và gửi cho LlamaParse
    const formData = new FormData();
    formData.append("file", fileBlob, fileName || "document.pdf");
    
    // ĐÂY LÀ "THẦN CHÚ" GIÚP AI ĐỌC TOÁN CỰC CHUẨN:
    formData.append("parsing_instruction", "You are a highly capable math and science parser. Extract all text and mathematical formulas. Convert all formulas, equations, and mathematical symbols into strict LaTeX format. Preserve the document structure.");

    const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`LlamaParse từ chối file: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const jobId = uploadData.id;

    // 3. Quá trình AI đọc file (Có thể mất 10-20 giây, hệ thống sẽ liên tục hỏi thăm)
    let isDone = false;
    let attempt = 0;
    const maxAttempts = 40; // Đợi tối đa 2 phút

    while (!isDone && attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Cứ 3 giây hỏi thăm 1 lần
      attempt++;

      const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const statusData = await statusRes.json();

      if (statusData.status === "SUCCESS") {
        isDone = true;
      } else if (statusData.status === "ERROR") {
        throw new Error("LlamaParse gặp lỗi trong lúc giải mã file.");
      }
    }

    if (!isDone) {
      throw new Error("Quá thời gian chờ AI xử lý (Time out).");
    }

    // 4. Lấy kết quả Markdown (đã chứa LaTeX) trả về cho giao diện
    const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    
    const resultData = await resultRes.json();
    const markdown = resultData.markdown;

    return NextResponse.json({ text: markdown });

  } catch (error: any) {
    console.error("Lỗi extractText-v2:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}