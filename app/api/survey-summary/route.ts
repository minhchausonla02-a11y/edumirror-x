// File: app/api/survey-summary/route.ts
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
      feeling: {} as Record<string, number>,
      understanding: {} as Record<string, number>,
      difficulties: {} as Record<string, number>,
      adjustments: {} as Record<string, number>,
      styles: {} as Record<string, number>,
      feedbacks: [] as any[]
    };

    responses?.forEach((row: any) => {
      let ans = row.answers;
      if (ans && ans.answers) ans = ans.answers;
      if (!ans && row.payload) ans = row.payload; 
      if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch (e) {} }

      if (!ans) return;
      
      // Đã bỏ dòng chặn spam ở đây để rác lọt được vào "Thùng rác AI" trên màn hình Giáo viên
      
      stats.total++;

      const q1 = ans.q1_feeling || ans.q1;
      if (q1) {
        const key = q1.includes("–") ? q1.split("–")[1]?.trim() : q1.includes("-") ? q1.split("-")[1]?.trim() : q1;
        stats.feeling[key] = (stats.feeling[key] || 0) + 1;
      }

      const q2 = ans.q2_understanding || ans.q2;
      if (q2) {
        const key = q2.includes("–") ? q2.split("–")[0]?.trim() : q2.includes("-") ? q2.split("-")[0]?.trim() : q2.substring(0,2); 
        stats.understanding[key] = (stats.understanding[key] || 0) + 1;
      }

      const q3 = ans.q3_difficulties || ans.q3;
      if (q3) {
        const q3Array = Array.isArray(q3) ? q3 : [q3];
        q3Array.forEach((item: string) => {
           if(item && !item.includes("nắm chắc")) stats.difficulties[item] = (stats.difficulties[item] || 0) + 1;
        });
      }

      const q4 = ans.q4_teacher_adjust || ans.q4;
      if (q4) {
        const q4Array = Array.isArray(q4) ? q4 : [q4];
        q4Array.forEach((item: string) => {
           if(item) {
             const key = item.split(" ")[0].length < 4 ? item : item; 
             stats.adjustments[key] = (stats.adjustments[key] || 0) + 1;
           }
        });
      }

      const q5 = ans.q5_learning_style || ans.q5;
      if (q5) {
        const q5Array = Array.isArray(q5) ? q5 : [q5];
        q5Array.forEach((item: string) => {
           if(item) stats.styles[item] = (stats.styles[item] || 0) + 1;
        });
      }

      if (ans.q6_feedback_text || ans.raw_text) {
          const isHarsh = row.is_harsh || ans.is_harsh || false;
          const isSOS = row.is_sos || ans.is_sos || false; 
          
          // ĐỊNH NGHĨA BIẾN MÀ VERCEL ĐANG BÁO THIẾU
          const isSpam = row.is_spam || ans.is_spam || false; 
          
          const aiSummary = row.ai_summary || ans.ai_summary || "";
          const rawText = ans.raw_text || ans.q6_feedback_text || "";

          stats.feedbacks.push({
              raw_text: rawText,
              is_harsh: isHarsh,
              is_sos: isSOS, 
              is_spam: isSpam, // Vercel sẽ không còn báo lỗi dòng này nữa
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