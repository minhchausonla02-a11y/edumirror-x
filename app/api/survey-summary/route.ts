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

    // Cấu trúc thống kê mới cho 6 câu
    const stats = {
      total: 0,
      feeling: {} as Record<string, number>,      // Q1
      understanding: {} as Record<string, number>, // Q2
      difficulties: {} as Record<string, number>,  // Q3
      adjustments: {} as Record<string, number>,   // Q4
      styles: {} as Record<string, number>,        // Q5
      feedbacks: [] as string[]                    // Q6
    };

    responses?.forEach((row: any) => {
      let ans = row.answers;
      // Logic tìm dữ liệu lồng nhau
      if (ans && ans.answers) ans = ans.answers;
      if (!ans && row.payload) ans = row.payload;
      if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch (e) {} }

      if (!ans) return;
      
      stats.total++;

      // Q1. Cảm nhận (q1_feeling)
      if (ans.q1_feeling) {
        const key = ans.q1_feeling.split("–")[1]?.trim() || ans.q1_feeling; // Lấy phần chữ sau dấu gạch
        stats.feeling[key] = (stats.feeling[key] || 0) + 1;
      }

      // Q2. Hiểu bài (q2_understanding)
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split("–")[0]?.trim(); // Lấy B1, B2...
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // Q3. Khó khăn (q3_difficulties - Multi)
      if (Array.isArray(ans.q3_difficulties)) {
        ans.q3_difficulties.forEach((item: string) => {
           stats.difficulties[item] = (stats.difficulties[item] || 0) + 1;
        });
      }

      // Q4. Điều chỉnh (q4_teacher_adjust - Multi)
      if (Array.isArray(ans.q4_teacher_adjust)) {
        ans.q4_teacher_adjust.forEach((item: string) => {
           stats.adjustments[item] = (stats.adjustments[item] || 0) + 1;
        });
      }

      // Q5. Phong cách học (q5_learning_style - Multi)
      if (Array.isArray(ans.q5_learning_style)) {
        ans.q5_learning_style.forEach((item: string) => {
           stats.styles[item] = (stats.styles[item] || 0) + 1;
        });
      }

      // Q6. Lời nhắn (q6_feedback_text)
      if (ans.q6_feedback_text) {
          stats.feedbacks.push(ans.q6_feedback_text);
      }
    });

    return NextResponse.json({ stats });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}