import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Tăng thời gian suy nghĩ lên tối đa để AI phân tích sâu hơn
export const maxDuration = 300; 

export async function POST(req: Request) {
  let filePath = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const model = formData.get("model") as string || "gpt-4o"; 
    const subject = formData.get("subject") as string;
    const grade = formData.get("grade") as string;
    const apiKey = formData.get("apiKey") as string;

    const finalKey = apiKey || process.env.OPENAI_API_KEY;
    if (!file || !finalKey) {
      return NextResponse.json({ error: "Thiếu File hoặc API Key" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: finalKey });

    // 1. Lưu file tạm
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    filePath = path.join(os.tmpdir(), file.name);
    await writeFile(filePath, buffer);

    // 2. Gửi file lên OpenAI
    const openAIFile = await client.files.create({
      file: await import("fs").then((fs) => fs.createReadStream(filePath)),
      purpose: "assistants",
    });

    // 3. TẠO CHUYÊN GIA THẨM ĐỊNH (PROMPT NÂNG CẤP)
    const assistant = await client.beta.assistants.create({
      name: "EduMirror Senior Critic",
      instructions: `Bạn là một CHUYÊN GIA THẨM ĐỊNH GIÁO ÁN cấp Quốc gia (Role: Senior Pedagogy Critic).
      Nhiệm vụ: Phân tích file giáo án ${subject} ${grade} được cung cấp.

      YÊU CẦU TƯ DUY:
      1. Đừng chỉ tóm tắt lại giáo án. Hãy ĐÁNH GIÁ và PHÊ BÌNH nó.
      2. Soi xét kỹ các Công thức Toán/Lý/Hóa: Có sai sót không? Có ký hiệu lạ không?
      3. Soi xét Hoạt động: Thời gian phân bố có hợp lý không? (Ví dụ: Bài khó mà dạy 5 phút là bất hợp lý).
      4. Ngôn ngữ: Chuyên nghiệp, sắc sảo, dùng thuật ngữ sư phạm (Bloom, PISA, Phát triển năng lực).

      CẤU TRÚC JSON TRẢ VỀ (Bắt buộc):
      {
        "result": {
          "summary": "Đánh giá tổng quan: Giáo án này thiết kế theo định hướng nào? (VD: 5E, Truyền thống...). Ưu điểm nổi bật nhất và Hạn chế lớn nhất là gì?",
          "objectives": [
            "Mục tiêu 1 (Kèm nhận xét: Đã cụ thể hóa hành vi chưa? Hay còn chung chung?)",
            "Mục tiêu 2..."
          ],
          "outline": [
            "Hoạt động 1 (Thời gian): Đánh giá tính hiệu quả (VD: Hoạt động này tốt nhưng hơi tốn thời gian...)",
            "Hoạt động 2..."
          ],
          "key_concepts": [
            "Kiến thức trọng tâm 1",
            "Công thức/Định lý quan trọng cần lưu ý sai sót"
          ],
          "pacing": [
            "CẢNH BÁO 1: Phần nào đang bị ôm đồm quá nhiều kiến thức?",
            "CẢNH BÁO 2: Phân bố thời gian chỗ nào chưa hợp lý?"
          ]
        }
      }
      Lưu ý: Trả về JSON thuần túy, KHÔNG dùng Markdown.`,
      model: model,
      tools: [{ type: "file_search" }],
    });

    // 4. Chạy luồng phân tích
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content: `Hãy thẩm định giáo án trong file đính kèm. Tìm ra các điểm vô lý và đề xuất cải tiến.`,
          attachments: [{ file_id: openAIFile.id, tools: [{ type: "file_search" }] }],
        },
      ],
    });

    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    // 5. Xử lý kết quả & LỌC SẠCH RÁC
    if (run.status === 'completed') {
      const messages = await client.beta.threads.messages.list(thread.id);
      let text = messages.data[0].content[0].type === 'text' ? messages.data[0].content[0].text.value : "{}";
      
      // BƯỚC QUAN TRỌNG: Lọc bỏ các ký tự citation như 【4:10†source】
      text = text.replace(/【\d+:\d+†source】/g, ""); 
      // Lọc bỏ markdown json
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // Dọn dẹp
      await client.files.delete(openAIFile.id);
      await client.beta.assistants.delete(assistant.id);
      
      return NextResponse.json(JSON.parse(jsonStr));
    } else {
      throw new Error("AI không phản hồi: " + run.status);
    }

  } catch (error: any) {
    console.error("Lỗi:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (filePath) try { await unlink(filePath); } catch {}
  }
}