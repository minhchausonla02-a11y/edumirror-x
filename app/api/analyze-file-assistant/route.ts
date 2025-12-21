import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Cho phép xử lý tối đa 5 phút (vì đọc file ảnh/PDF lâu hơn text)
export const maxDuration = 300;

export async function POST(req: Request) {
  let filePath = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const model = formData.get("model") as string || "gpt-4o"; // Mặc định dùng gpt-4o xịn
    const subject = formData.get("subject") as string;
    const grade = formData.get("grade") as string;
    const apiKey = formData.get("apiKey") as string;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!file || !finalKey) {
      return NextResponse.json({ error: "Thiếu File hoặc API Key" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: finalKey });

    // 1. Lưu file tạm vào server để chuẩn bị gửi
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    filePath = path.join(os.tmpdir(), file.name); // Lưu vào thư mục tạm
    await writeFile(filePath, buffer);

    // 2. Gửi file lên OpenAI
    const openAIFile = await client.files.create({
      file: await import("fs").then((fs) => fs.createReadStream(filePath)),
      purpose: "assistants",
    });

   // 3. Tạo một Trợ lý ảo chuyên đọc Toán (Phiên bản Tiếng Việt)
    const assistant = await client.beta.assistants.create({
      name: "Math Reader Expert VN",
      instructions: `Bạn là một Chuyên gia Sư phạm và Toán học hàng đầu tại Việt Nam.
      Nhiệm vụ: Đọc file giáo án đính kèm (Word/PDF/Ảnh chứa công thức Toán/Lý/Hóa).
      
      YÊU CẦU BẮT BUỘC:
      1. Ngôn ngữ đầu ra: 100% TIẾNG VIỆT.
      2. Phân tích sâu sắc về phương pháp sư phạm và độ chính xác của công thức toán.
      3. Trả về kết quả duy nhất là một JSON object (không được có text thừa) theo đúng cấu trúc sau:
      {
        "result": {
          "summary": "Tóm tắt ngắn gọn nội dung bài dạy (khoảng 3-4 dòng)...",
          "strengths": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
          "improvements": ["Góp ý khắc phục 1", "Góp ý khắc phục 2", "Góp ý khắc phục 3"],
          "math_check": "Nhận xét chi tiết về độ khó và tính chính xác của các công thức toán trong bài."
        }
      }`,
      model: model,
      tools: [{ type: "file_search" }],
    });

    // 4. Tạo hội thoại và chạy
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `Phân tích giáo án môn ${subject} ${grade} này.`,
          attachments: [{ file_id: openAIFile.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });

    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    // 5. Lấy kết quả
    if (run.status === 'completed') {
      const messages = await client.beta.threads.messages.list(thread.id);
      const text = messages.data[0].content[0].type === 'text' ? messages.data[0].content[0].text.value : "{}";
      
      // Dọn dẹp JSON (xóa ký tự thừa)
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
  // Dọn dẹp Server (Xóa file, xóa trợ lý để tiết kiệm)
await client.files.delete(openAIFile.id);       // Sửa .del -> .delete
await client.beta.assistants.delete(assistant.id); // Sửa .del -> .delete
      
      return NextResponse.json(JSON.parse(jsonStr));
    } else {
      throw new Error("AI không đọc được file.");
    }

  } catch (error: any) {
    console.error("Lỗi:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Luôn xóa file tạm
    if (filePath) try { await unlink(filePath); } catch {}
  }
}