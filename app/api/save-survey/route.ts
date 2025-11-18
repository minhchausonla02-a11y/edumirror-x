import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function genShortId() {
  // ID ngắn 6–8 ký tự, đủ dùng để phân biệt các bài
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Tuỳ phiên bản cũ, dữ liệu có thể nằm ở body.survey hoặc body.payload
    const survey = body?.survey ?? body?.payload;
    if (!survey) {
      return NextResponse.json(
        { ok: false, error: "Thiếu dữ liệu phiếu khảo sát (survey)." },
        { status: 400 }
      );
    }

    // Nếu FE gửi kèm shortId cũ thì dùng lại, không thì tạo mới
    let shortId: string =
      typeof body?.shortId === "string" && body.shortId.trim().length > 0
        ? body.shortId.trim()
        : genShortId();

    const supabase = getSupabaseAdmin();

    // Lưu / cập nhật vào bảng surveys
    const { error } = await supabase
      .from("surveys")
      .upsert(
        {
          short_id: shortId,
          payload: survey,
        },
        { onConflict: "short_id" } // nếu shortId đã tồn tại thì update
      );

    if (error) {
      console.error("Supabase save-survey error:", error);
      return NextResponse.json(
        { ok: false, error: "Lưu phiếu khảo sát lên Supabase thất bại." },
        { status: 500 }
      );
    }

    // ⭐ Quan trọng: luôn trả về shortId cho frontend dùng sinh QR
    return NextResponse.json({ ok: true, shortId, survey });
  } catch (err: any) {
    console.error("save-survey API error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Lỗi không xác định khi lưu phiếu khảo sát.",
      },
      { status: 500 }
    );
  }
}
