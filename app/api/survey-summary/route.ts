import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("id");

  // Kết nối
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  try {
    // Lấy dữ liệu
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("*") // Lấy hết các cột để debug
      .eq("survey_short_id", surveyId);

    if (error) throw error;

    const stats = {
      total: 0,
      sentiment: {} as Record<string, number>,
      understanding: {} as Record<string, number>,
      gaps: {} as Record<string, number>,
      wishes: {} as Record<string, number>,
      feedbacks: [] as string[]
    };

    console.log(`🔍 Tìm thấy ${responses?.length} bản ghi cho ID: ${surveyId}`);

    responses?.forEach((row: any) => {
      // --- LOGIC "ĐÀO DỮ LIỆU" THÔNG MINH ---
      // Thử tìm answers ở nhiều chỗ khác nhau để tránh bị null
      let ans = row.answers;
      
      // Trường hợp 1: answers bị bọc trong một object khác tên là answers (lỗi thường gặp)
      if (ans && ans.answers) ans = ans.answers;
      
      // Trường hợp 2: Dữ liệu nằm ở cột khác (phòng hờ)
      if (!ans && row.payload) ans = row.payload;

      // Nếu vẫn không có dữ liệu hợp lệ thì bỏ qua
      if (!ans || (!ans.q1_sentiment && !ans.q2_understanding)) {
          console.log("⚠️ Bản ghi rỗng hoặc sai format:", row);
          return;
      }

      // Nếu tìm thấy dữ liệu hợp lệ -> Tăng biến đếm tổng
      stats.total++;

      // --- BẮT ĐẦU ĐẾM ---
      
      // 1. Cảm xúc
      if (ans.q1_sentiment) {
        const key = ans.q1_sentiment.split("|")[0].trim();
        stats.sentiment[key] = (stats.sentiment[key] || 0) + 1;
      }

      // 2. Hiểu bài
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split(":")[0].trim();
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // 3. Điểm nghẽn
      if (Array.isArray(ans.q3_gaps)) {
        ans.q3_gaps.forEach((gap: string) => {
          if (gap && !gap.includes("Không có")) {
             const cleanGap = gap.length > 60 ? gap.substring(0, 57) + "..." : gap;
             stats.gaps[cleanGap] = (stats.gaps[cleanGap] || 0) + 1;
          }
        });
      }

      // 4. Mong muốn
      if (Array.isArray(ans.q4_wishes)) {
        ans.q4_wishes.forEach((wish: string) => {
           stats.wishes[wish] = (stats.wishes[wish] || 0) + 1;
        });
      }

      // 5. Lời nhắn
      if (ans.q5_feedback) {
          stats.feedbacks.push(ans.q5_feedback);
      }
    });

    return NextResponse.json({ stats });

  } catch (err: any) {
    console.error("Lỗi API Summary:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}