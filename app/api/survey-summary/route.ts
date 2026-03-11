import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get("id");

    if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

    const supabase = await createClient();

    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("*") 
      .eq("survey_short_id", surveyId); 

    if (error) throw error;

    const stats = {
      total: 0,
      feeling: {} as Record<string, number>,      // Q1: Cảm nhận
      understanding: {} as Record<string, number>, // Q2: Hiểu bài
      difficulties: {} as Record<string, number>,  // Q3: Khó khăn
      adjustments: {} as Record<string, number>,   // Q4: Điều chỉnh
      styles: {} as Record<string, number>,        // Q5: Phong cách học
      feedbacks: [] as any[]                       // Q6: Lời nhắn
    };

    responses?.forEach((row: any) => {
      let ans = row.answers;
      if (ans && ans.answers) ans = ans.answers;
      if (!ans && row.payload) ans = row.payload; 
      if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch (e) {} }

      if (!ans) return;
      
      // Bỏ qua nếu dòng này đã bị AI đánh dấu là rác (Spam) từ trước
      if (row.is_spam || ans.is_spam) return;

      stats.total++;

      // Q1: Cảm nhận (q1_feeling)
      if (ans.q1_feeling) {
        const key = ans.q1_feeling.split("–")[1]?.trim() || ans.q1_feeling;
        stats.feeling[key] = (stats.feeling[key] || 0) + 1;
      }

      // Q2: Hiểu bài (q2_understanding)
      if (ans.q2_understanding) {
        const key = ans.q2_understanding.split("–")[0]?.trim(); 
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      // Q3: Khó khăn (q3_difficulties)
      if (Array.isArray(ans.q3_difficulties)) {
        ans.q3_difficulties.forEach((item: string) => {
           if(!item.includes("nắm chắc")) 
              stats.difficulties[item] = (stats.difficulties[item] || 0) + 1;
        });
      }

      // Q4: Điều chỉnh (q4_teacher_adjust)
      if (Array.isArray(ans.q4_teacher_adjust)) {
        ans.q4_teacher_adjust.forEach((item: string) => {
           const key = item.split(" ")[0].length < 4 ? item : item; 
           stats.adjustments[key] = (stats.adjustments[key] || 0) + 1;
        });
      }

      // Q5: Phong cách học (q5_learning_style)
      if (Array.isArray(ans.q5_learning_style)) {
        ans.q5_learning_style.forEach((item: string) => {
           stats.styles[item] = (stats.styles[item] || 0) + 1;
        });
      }

      // --- Q6: LỜI NHẮN (ĐÃ NÂNG CẤP KẾT NỐI AI) ---
      if (ans.q6_feedback_text) {
          const isHarsh = row.is_harsh || ans.is_harsh || false;
          const isSOS = row.is_sos || ans.is_sos || false; 
          const aiSummary = row.ai_summary || ans.ai_summary || "";
          const rawText = row.raw_text || ans.raw_text || ans.q6_feedback_text;

          stats.feedbacks.push({
              raw_text: rawText,
              is_harsh: isHarsh,
              is_sos: isSOS, 
              ai_summary: aiSummary
          });
      }
    });

    return NextResponse.json({ stats });

  } catch (err: any) {
    console.error("Lỗi API thống kê:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}