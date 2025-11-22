import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("id");

  // Kết nối Supabase (đảm bảo dùng Key có quyền đọc)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  try {
    // 1. Lấy dữ liệu trả lời khớp với short_id
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("answers")
      .eq("survey_short_id", surveyId);

    if (error) {
        console.error("Lỗi Supabase:", error);
        throw error;
    }

    // 2. Khởi tạo bộ đếm
    const stats = {
      total: responses?.length || 0,
      sentiment: {} as Record<string, number>,
      understanding: {} as Record<string, number>,
      gaps: {} as Record<string, number>,
      wishes: {} as Record<string, number>,
      feedbacks: [] as string[]
    };

    // 3. Duyệt và đếm (Logic mới linh hoạt hơn)
    responses?.forEach((row: any) => {
      // Một số trường hợp answers bị bọc trong mảng hoặc object khác, ta lấy phần core
      const ans = row.answers?.answers || row.answers; 
      if (!ans) return;

      // Đếm Cảm xúc
      if (ans.q1_sentiment) {
        const key = ans.q1_sentiment.split("|")[0].trim(); // Lấy icon
        stats.sentiment[key] = (stats.sentiment[key] || 0) + 1;
      }

      // Đếm Hiểu bài
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split(":")[0].trim(); // Lấy Mức 1...
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // Đếm Điểm nghẽn (Mảng)
      if (Array.isArray(ans.q3_gaps)) {
        ans.q3_gaps.forEach((gap: string) => {
          if (gap && !gap.includes("Không có")) {
             stats.gaps[gap] = (stats.gaps[gap] || 0) + 1;
          }
        });
      }

      // Đếm Mong muốn (Mảng)
      if (Array.isArray(ans.q4_wishes)) {
        ans.q4_wishes.forEach((wish: string) => {
           stats.wishes[wish] = (stats.wishes[wish] || 0) + 1;
        });
      }

      // Lấy Lời nhắn
      if (ans.q5_feedback) {
          stats.feedbacks.push(ans.q5_feedback);
      }
    });

    return NextResponse.json({ stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}