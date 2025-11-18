import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shortId = searchParams.get("shortId") || searchParams.get("id");

    if (!shortId) {
      return NextResponse.json(
        { ok: false, error: "Thiếu shortId trong query (?shortId=...)." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Lấy tất cả phiếu thuộc cùng shortId (cùng 1 bài học)
    const { data, error } = await supabase
      .from("survey_responses")
      .select("answers")
      .eq("survey_short_id", shortId);

    if (error) {
      console.error("Supabase select error (survey_responses):", error);
      return NextResponse.json(
        { ok: false, error: "Không tải được dữ liệu phiếu." },
        { status: 500 }
      );
    }

    const responses = (data || []).map((row: any) => row.answers || {});
    const total = responses.length;

    if (total === 0) {
      return NextResponse.json({
        ok: true,
        shortId,
        totalResponses: 0,
        message: "Chưa có học sinh nào gửi phiếu cho QR này.",
      });
    }

    // Hàm tiện ích đếm tần suất 1 câu single (radio)
    function countSingle(questionId: string) {
      const counts: Record<string, number> = {};
      for (const ans of responses) {
        const v = ans[questionId];
        if (!v || typeof v !== "string") continue;
        counts[v] = (counts[v] || 0) + 1;
      }
      return counts;
    }

    // Đếm tần suất câu multi (checkbox) – mỗi lựa chọn tính 1 lần
    function countMulti(questionId: string) {
      const counts: Record<string, number> = {};
      for (const ans of responses) {
        const v = ans[questionId];
        if (!v) continue;

        if (Array.isArray(v)) {
          for (const option of v) {
            if (!option || typeof option !== "string") continue;
            counts[option] = (counts[option] || 0) + 1;
          }
        } else if (typeof v === "string") {
          // Phòng trường hợp chỉ chọn 1 nhưng lưu thành string
          counts[v] = (counts[v] || 0) + 1;
        }
      }
      return counts;
    }

    // Tạo thống kê cho các câu quan trọng
    const understanding = countSingle("q1_understanding"); // Mức độ hiểu bài
    const weakParts = countMulti("q2_weak_parts");          // Phần chưa vững
    const misconceptions = countMulti("q3_misconceptions"); // Chỗ dễ nhầm
    const pace = countSingle("q4_pace");                    // Tốc độ giảng
    const nextNeeds = countMulti("q4_needs_next");          // Mong muốn tiết sau
    const confidence = countSingle("q5_confidence");        // Độ tự tin
    const emotion = countSingle("q7_emotion");              // Cảm xúc

    // Tạo % cho các câu single (radio)
    function toPercent(counts: Record<string, number>) {
      const result: Record<string, number> = {};
      for (const key of Object.keys(counts)) {
        result[key] = Math.round((counts[key] * 100) / total);
      }
      return result;
    }

    const summary = {
      shortId,
      totalResponses: total,

      understanding: {
        counts: understanding,
        percents: toPercent(understanding),
      },

      pace: {
        counts: pace,
        percents: toPercent(pace),
      },

      confidence: {
        counts: confidence,
        percents: toPercent(confidence),
      },

      emotion: {
        counts: emotion,
        percents: toPercent(emotion),
      },

      weakParts: {
        counts: weakParts,
      },

      misconceptions: {
        counts: misconceptions,
      },

      nextNeeds: {
        counts: nextNeeds,
      },
    };

    return NextResponse.json({ ok: true, summary });
  } catch (err: any) {
    console.error("survey-summary API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định." },
      { status: 500 }
    );
  }
}
