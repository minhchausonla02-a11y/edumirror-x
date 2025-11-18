// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Body rỗng, không có dữ liệu phiếu." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Lấy mã phiếu ngắn nếu frontend có gửi kèm
    const surveyShortId =
      body.shortId ||
      body.surveyShortId ||
      body.survey_short_id ||
      null;

    // Label lớp nếu có (VD: 12A1)
    const classLabel = body.classId || body.class_label || null;

    // Nếu frontend đã gói sẵn trong answers thì dùng, không thì lưu cả body
    const answers = body.answers ?? body;

    const { error } = await supabase
      .from("survey_responses")
      .insert({
        survey_short_id: surveyShortId,
        class_label: classLabel,
        answers,
      });

    if (error) {
      console.error("Supabase insert error (survey_responses):", error);
      return NextResponse.json(
        { ok: false, error: "Lưu phiếu khảo sát thất bại." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("save-survey API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định." },
      { status: 500 }
    );
  }
}
