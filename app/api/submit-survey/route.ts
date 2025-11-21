// File: app/api/submit-survey/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { surveyId, answers } = body; // surveyId chính là short_id

    if (!surveyId || !answers) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

    // Ghi vào bảng 'survey_responses' (Khớp với ảnh số 1 bạn gửi)
    // Cột: survey_short_id, answers
    const { error } = await supabase
      .from("survey_responses")
      .insert([
        { 
          survey_short_id: surveyId, 
          answers: answers 
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}