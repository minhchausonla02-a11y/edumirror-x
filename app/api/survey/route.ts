// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Thiếu id phiếu khảo sát." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .maybeSingle(); // không ném lỗi nếu 0 dòng

    if (error) {
      console.error("❌ Supabase /api/survey error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: `Lỗi truy vấn CSDL: ${error.message}`,
        },
        { status: 500 }
      );
    }

    if (!data) {
      // Không có dòng nào khớp short_id
      return NextResponse.json(
        {
          ok: false,
          error: "Không tìm thấy phiếu khảo sát (id không tồn tại).",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        survey: data.payload,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Unexpected /api/survey error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: `Lỗi hệ thống: ${err?.message ?? String(err)}`,
      },
      { status: 500 }
    );
  }
}
