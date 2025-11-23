import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("id");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  try {
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("answers")
      .eq("survey_short_id", surveyId);

    if (error) throw error;

    // Cấu trúc thống kê chuẩn cho 6 câu hỏi
    const stats = {
      total: 0,
      feeling: {} as Record<string, number>,      // Q1: Cảm nhận
      understanding: {} as Record<string, number>, // Q2: Hiểu bài
      difficulties: {} as Record<string, number>,  // Q3: Khó khăn
      adjustments: {} as Record<string, number>,   // Q4: Điều chỉnh
      styles: {} as Record<string, number>,        // Q5: Phong cách học (MỚI)
      feedbacks: [] as string[]                    // Q6: Lời nhắn
    };

    responses?.forEach((row: any) => {
      let ans = row.answers;
      // Xử lý dữ liệu lồng nhau nếu có
      if (ans && ans.answers) ans = ans.answers;
      if (!ans && row.payload) ans = row.payload;
      if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch (e) {} }

      if (!ans) return;
      
      stats.total++;

      // Q1: Cảm nhận (q1_feeling)
      // VD: "A1 - Hứng thú" -> Lấy "Hứng thú"
      if (ans.q1_feeling) {
        const key = ans.q1_feeling.split("–")[1]?.trim() || ans.q1_feeling;
        stats.feeling[key] = (stats.feeling[key] || 0) + 1;
      }

      // Q2: Hiểu bài (q2_understanding)
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split("–")[0]?.trim(); // Lấy B1, B2
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // Q3: Khó khăn (q3_difficulties) - Mảng
      if (Array.isArray(ans.q3_difficulties)) {
        ans.q3_difficulties.forEach((item: string) => {
           if(!item.includes("nắm chắc")) // Bỏ qua lựa chọn "nắm chắc" để biểu đồ tập trung vào vấn đề
              stats.difficulties[item] = (stats.difficulties[item] || 0) + 1;
        });
      }

      // Q4: Điều chỉnh (q4_teacher_adjust) - Mảng
      if (Array.isArray(ans.q4_teacher_adjust)) {
        ans.q4_teacher_adjust.forEach((item: string) => {
           // Lấy icon đầu dòng cho gọn (nếu có) hoặc lấy cả câu
           const key = item.split(" ")[0].length < 4 ? item : item; 
           stats.adjustments[key] = (stats.adjustments[key] || 0) + 1;
        });
      }

      // Q5: Phong cách học (q5_learning_style) - Mảng (MỚI)
      if (Array.isArray(ans.q5_learning_style)) {
        ans.q5_learning_style.forEach((item: string) => {
           stats.styles[item] = (stats.styles[item] || 0) + 1;
        });
      }

      // Q6: Lời nhắn (q6_feedback_text)
      if (ans.q6_feedback_text) {
          stats.feedbacks.push(ans.q6_feedback_text);
      }
    });

    return NextResponse.json({ stats });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}