// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Thiếu mã phiếu khảo sát (id)." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "Supabase chưa được cấu hình trên server." },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("surveys")
      .select("payload")
      .or(`short_id.eq.${id},id.eq.${id}`)
      .single();

    if (error) {
      console.error("Supabase survey fetch error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy phiếu khảo sát." },
        { status: 404 }
      );
    }

    // Lúc lưu, ta dùng payload = { survey: surveyData }
    const payload: any = data.payload || {};
    const survey = payload.survey || payload.survey_v2 || payload;

    if (!survey) {
      return NextResponse.json(
        { ok: false, error: "Dữ liệu phiếu khảo sát không hợp lệ." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, survey },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in /api/survey:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
