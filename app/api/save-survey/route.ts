// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";        // chạy NodeJS, không Edge
export const dynamic = "force-dynamic"; // không cache cứng

function makeShortId(length: number = 8) {
  return Math.random().toString(36).slice(2, 2 + length);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const survey = body?.survey;

    if (!survey) {
      return NextResponse.json(
        { ok: false, error: "Thiếu dữ liệu survey trong body." },
        { status: 400 }
      );
    }

    // Nếu CHƯA có Supabase → chỉ tạo shortId để dùng cho QR, không lưu DB
    if (!supabaseAdmin) {
      const shortId =
        survey.shortId || survey.short_id || survey.id || makeShortId(8);

      return NextResponse.json(
        { ok: true, id: shortId, shortId },
        { status: 200 }
      );
    }

    // Có Supabase → lưu vào bảng "surveys"
    const shortId =
      survey.shortId || survey.short_id || makeShortId(8);

    const { data, error } = await supabaseAdmin
      .from("surveys")
      .insert({
        short_id: shortId,
        payload: { survey },
        created_at: new Date().toISOString(),
      })
      .select("id, short_id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, id: data.id, shortId: data.short_id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in /api/save-survey:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
