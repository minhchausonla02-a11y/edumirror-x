import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("id"); // short_id của phiếu

  if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  try {
    // 1. Lấy tất cả câu trả lời của phiếu này
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("answers, created_at")
      .eq("survey_short_id", surveyId);

    if (error) throw error;

    // 2. Khởi tạo bộ đếm
    const stats = {
      total: responses.length,
      sentiment: {} as Record<string, number>,
      understanding: {} as Record<string, number>,
      gaps: {} as Record<string, number>,
      wishes: {} as Record<string, number>,
      feedbacks: [] as string[]
    };

    // 3. Duyệt qua từng phiếu để cộng dồn
    responses.forEach((row: any) => {
      const ans = row.answers;

      // Đếm Cảm xúc (Q1)
      if (ans.q1_sentiment) {
        // Chỉ lấy phần text chính (VD: "Hứng thú") bỏ phần mô tả sau dấu |
        const key = ans.q1_sentiment.split("|")[0].trim();
        stats.sentiment[key] = (stats.sentiment[key] || 0) + 1;
      }

      // Đếm Mức hiểu (Q2)
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split(":")[0].trim(); // Lấy "Mức 1", "Mức 2"...
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // Đếm Lỗ hổng kiến thức (Q3 - Checkbox nhiều lựa chọn)
      if (Array.isArray(ans.q3_gaps)) {
        ans.q3_gaps.forEach((gap: string) => {
          if (gap !== "Không có, em nắm chắc rồi") {
             stats.gaps[gap] = (stats.gaps[gap] || 0) + 1;
          }
        });
      }

      // Đếm Mong muốn (Q4 - Checkbox)
      if (Array.isArray(ans.q4_wishes)) {
        ans.q4_wishes.forEach((wish: string) => {
           stats.wishes[wish] = (stats.wishes[wish] || 0) + 1;
        });
      }

      // Lấy Feedback (Q5)
      if (ans.q5_feedback && ans.q5_feedback.trim().length > 0) {
        stats.feedbacks.push(ans.q5_feedback);
      }
    });

    return NextResponse.json({ stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}