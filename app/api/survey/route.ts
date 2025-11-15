// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase chưa được cấu hình trên server, không truy xuất được phiếu khảo sát.",
        },
        { status: 500 }
      );
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Thiếu id phiếu khảo sát." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .maybeSingle(); // khác single(): không xem "không có dòng" là lỗi

    if (error) {
      console.error("Supabase /api/survey error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: `Lỗi truy vấn CSDL: ${error.message}`,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không tìm thấy phiếu khảo sát trong CSDL.",
        },
        { status: 404 }
      );
    }

    if (!data.payload) {
      return NextResponse.json(
        { ok: false, error: "Phiếu khảo sát không có payload." },
        { status: 500 }
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
    console.error("Unexpected /api/survey error:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
