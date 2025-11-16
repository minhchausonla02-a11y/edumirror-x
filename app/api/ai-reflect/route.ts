// app/api/ai-reflect/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

type FeedbackStats = {
  understood: number;
  notClear: number;
  tooFast: number;
  needExamples: number;
  total: number;
};

type RequestBody = {
  stats: FeedbackStats;
  lessonPlan?: string; // có thể null / undefined
  model?: string;
};

const apiKey =
  process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_PROXY || "";

const client = apiKey
  ? new OpenAI({ apiKey })
  : null;

export async function POST(req: Request) {
  try {
    if (!client) {
      return NextResponse.json(
        { error: "Thiếu OPENAI_API_KEY (hoặc OPENAI_API_KEY_PROXY) trên server." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as RequestBody;
    const { stats, lessonPlan, model } = body;

    if (!stats || typeof stats.total !== "number") {
      return NextResponse.json(
        { error: "Thiếu hoặc sai định dạng trường 'stats' trong body." },
        { status: 400 }
      );
    }

    const { understood, notClear, tooFast, needExamples, total } = stats;

    const summary = [
      `Tổng số phiếu: ${total}`,
      `Hiểu bài: ${understood}`,
      `Chưa rõ nội dung: ${notClear}`,
      `Cảm thấy tiết dạy hơi nhanh: ${tooFast}`,
      `Cần thêm ví dụ: ${needExamples}`,
    ].join(" | ");

    const lpText = lessonPlan && lessonPlan.trim().length > 0
      ? lessonPlan.trim()
      : "Giáo viên chưa cung cấp chi tiết giáo án. Hãy gợi ý ở mức tổng quát cho môn Toán THPT.";

    const completion = await client.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý sư phạm hỗ trợ giáo viên THPT (đặc biệt là môn Toán) điều chỉnh tiết dạy. " +
            "Hãy phân tích số liệu phiếu 60 giây sau tiết học và đưa ra gợi ý cụ thể, thực tế, dễ áp dụng ngay. " +
            "Giữ giọng văn ngắn gọn, tôn trọng giáo viên, không phê phán cá nhân.",
        },
        {
          role: "user",
          content: [
            "Dưới đây là thống kê phiếu 60s của học sinh sau tiết học:",
            "",
            summary,
            "",
            "Thông tin thêm về giáo án / tiết dạy:",
            lpText,
            "",
            "Hãy:",
            "1) Nhận xét nhanh về mức độ hiểu bài và khó khăn của lớp.",
            "2) Chỉ ra 2–4 điểm giáo viên nên điều chỉnh cho TIẾT DẠY SAU (tốc độ, cách giải thích, ví dụ, bài tập, hoạt động nhóm…).",
            "3) Nếu có nhiều em chọn 'Cần thêm ví dụ' hoặc 'Tiết dạy hơi nhanh', hãy gợi ý luôn 1–2 chiến lược rất cụ thể (ví dụ: dùng sơ đồ, bảng tóm tắt, bài tập mẫu, phân nhóm…).",
            "Trình bày theo gạch đầu dòng, tiếng Việt.",
          ].join("\n"),
        },
      ],
      temperature: 0.5,
    });

    const result =
      completion.choices[0]?.message?.content ??
      "Không nhận được phản hồi từ AI.";

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("[ai-reflect] error:", err);
    return NextResponse.json(
      { error: err?.message || "Có lỗi khi gọi AI phân tích." },
      { status: 500 }
    );
  }
}
