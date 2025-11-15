// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Thiếu tham số id." },
      { status: 400 }
    );
  }

  try {
    // Lấy phiếu khảo sát theo short_id
    const { data, error } = await supabaseAdmin
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .single();

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
          error: "Không tìm thấy phiếu khảo sát.",
        },
        { status: 404 }
      );
    }

    // payload chính là JSON Phiếu 60s
    return NextResponse.json(
      {
        ok: true,
        survey: data.payload,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Unexpected /api/survey error:", err);
    const msg =
      err instanceof Error
        ? `TypeError: ${err.message}`
        : String(err);

    return NextResponse.json(
      {
        ok: false,
        error: `Lỗi truy vấn CSDL: ${msg}`,
      },
      { status: 500 }
    );
  }
}
