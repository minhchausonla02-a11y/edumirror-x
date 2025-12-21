import { NextResponse } from "next/server";
// 1. THAY ĐỔI QUAN TRỌNG: Dùng thư viện kết nối Server mới
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get("id");

    if (!surveyId) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

    // 2. KHỞI TẠO KẾT NỐI BẢO MẬT (Để vượt qua lớp bảo vệ RLS)
    const supabase = await createClient();

    // 3. LẤY DỮ LIỆU
    // Lưu ý: Tôi đổi thành select('*') để lấy cả cột 'payload' lẫn 'answers'
    // nhằm đảm bảo logic bên dưới của bạn luôn tìm thấy dữ liệu.
    const { data: responses, error } = await supabase
      .from("survey_responses")
      .select("*") 
      .eq("survey_id", surveyId); // Lưu ý: Thường cột liên kết là survey_id, nếu bảng của bạn là survey_short_id thì sửa lại chỗ này nhé.

    if (error) throw error;

    // =================================================================
    // TỪ ĐÂY TRỞ XUỐNG LÀ LOGIC CŨ CỦA BẠN (GIỮ NGUYÊN 100%)
    // =================================================================
    
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
      // Logic tìm dữ liệu của bạn rất thông minh, tôi giữ nguyên
      let ans = row.answers;
      // Xử lý dữ liệu lồng nhau nếu có
      if (ans && ans.answers) ans = ans.answers;
      if (!ans && row.payload) ans = row.payload; // Fallback sang payload
      if (typeof ans === 'string') { try { ans = JSON.parse(ans); } catch (e) {} }

      if (!ans) return;
      
      stats.total++;

      // Q1: Cảm nhận (q1_feeling)
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
           if(!item.includes("nắm chắc")) 
              stats.difficulties[item] = (stats.difficulties[item] || 0) + 1;
        });
      }

      // Q4: Điều chỉnh (q4_teacher_adjust) - Mảng
      if (Array.isArray(ans.q4_teacher_adjust)) {
        ans.q4_teacher_adjust.forEach((item: string) => {
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
    console.error("Lỗi API thống kê:", err); // Thêm log để dễ debug
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}