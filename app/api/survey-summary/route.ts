import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("id");

  // 1. Kết nối Supabase (Dùng Service Role để đảm bảo quyền đọc full)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Chưa cấu hình Supabase Key" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!surveyId) return NextResponse.json({ error: "Thiếu ID phiếu" }, { status: 400 });

  try {
    // 2. Lấy dữ liệu từ bảng survey_responses
    // Chỉ lấy cột answers để tiết kiệm băng thông
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("answers")
      .eq("survey_short_id", surveyId);

    if (error) throw error;

    // 3. Chuẩn bị khung chứa số liệu
    const stats = {
      total: responses?.length || 0,
      sentiment: {} as Record<string, number>,
      understanding: {} as Record<string, number>,
      gaps: {} as Record<string, number>,
      wishes: {} as Record<string, number>,
      feedbacks: [] as string[]
    };

    // 4. Thuật toán Đếm thông minh (Smart Counting Logic)
    responses?.forEach((row: any) => {
      const ans = row.answers;
      if (!ans) return;

      // --- Xử lý Cảm xúc (Q1) ---
      if (ans.q1_sentiment) {
        // Tự động cắt bỏ phần mô tả sau dấu | (Nếu có)
        // VD: "🤩 Hứng thú | Em thấy vui" -> Lấy "🤩 Hứng thú"
        const key = ans.q1_sentiment.split("|")[0].trim();
        stats.sentiment[key] = (stats.sentiment[key] || 0) + 1;
      }

      // --- Xử lý Hiểu bài (Q2) ---
      if (ans.q2_understanding) {
        // VD: "Mức 1: Chưa hiểu" -> Lấy "Mức 1" hoặc lấy cả câu đều được
        // Ở đây ta lấy cả câu nhưng cắt ngắn nếu quá dài
        let key = ans.q2_understanding;
        if (key.includes(":")) key = key.split(":")[0].trim(); // Lấy "Mức 1"
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // --- Xử lý Điểm nghẽn (Q3 - Mảng) ---
      if (Array.isArray(ans.q3_gaps)) {
        ans.q3_gaps.forEach((gap: string) => {
          if (gap && !gap.includes("Không có")) { // Bỏ qua lựa chọn "Không có"
             // Cắt ngắn nếu tên kiến thức quá dài để biểu đồ đẹp hơn
             const cleanGap = gap.length > 50 ? gap.substring(0, 47) + "..." : gap;
             stats.gaps[cleanGap] = (stats.gaps[cleanGap] || 0) + 1;
          }
        });
      }

      // --- Xử lý Mong muốn (Q4 - Mảng) ---
      if (Array.isArray(ans.q4_wishes)) {
        ans.q4_wishes.forEach((wish: string) => {
           // Lấy icon đầu dòng làm key hiển thị cho gọn, hoặc lấy cả câu
           // VD: "🐢 Giảng chậm" -> lấy nguyên văn
           stats.wishes[wish] = (stats.wishes[wish] || 0) + 1;
        });
      }

      // --- Xử lý Lời nhắn (Q5) ---
      if (ans.q5_feedback && typeof ans.q5_feedback === 'string') {
        const fb = ans.q5_feedback.trim();
        if (fb.length > 0) stats.feedbacks.push(fb);
      }
    });

    console.log(`Đã xử lý ${stats.total} phiếu cho ID ${surveyId}`);
    return NextResponse.json({ stats });

  } catch (err: any) {
    console.error("Lỗi Survey Summary:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}