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
    // Lấy toàn bộ dữ liệu để debug
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("*")
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
      // --- LOGIC QUAN TRỌNG: TÌM DỮ LIỆU BỊ ẨN ---
      let ans = row.answers;

      // Trường hợp 1: Bị bọc trong answers (Lỗi thường gặp nhất)
      if (ans && ans.answers) ans = ans.answers;
      
      // Trường hợp 2: Bị bọc trong payload
      if (!ans && row.payload) ans = row.payload;

      // Trường hợp 3: Nếu là chuỗi JSON string thì parse ra
      if (typeof ans === 'string') {
          try { ans = JSON.parse(ans); } catch (e) {}
      }

      // Kiểm tra xem đã lấy đúng chưa (phải có ít nhất 1 trường q1 hoặc q2)
      if (!ans || (!ans.q1_sentiment && !ans.q2_understanding)) {
          console.log("⚠️ Bỏ qua dòng rác:", row);
          return; 
      }

      // Tăng tổng số phiếu hợp lệ
      stats.total++;

      // --- BẮT ĐẦU ĐẾM (AN TOÀN HƠN) ---
      
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
             // Cắt ngắn bớt nếu quá dài
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