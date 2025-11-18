import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.answers) {
      return NextResponse.json(
        { ok: false, error: "Thiếu dữ liệu câu trả lời." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const surveyShortId = body.shortId || null;
    const classLabel = body.classLabel || null;

    const { error } = await supabase.from("survey_responses").insert({
      survey_short_id: surveyShortId,
      class_label: classLabel,
      answers: body.answers,
    });

    if (error) {
      console.error("Lưu câu trả lời thất bại:", error);
      return NextResponse.json(
        { ok: false, error: "Lưu phiếu khảo sát thất bại." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("submit-survey API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định." },
      { status: 500 }
    );
  }
}
