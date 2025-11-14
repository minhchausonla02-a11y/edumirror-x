// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json(
        { error: "Lỗi server khi đọc phiếu khảo sát." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Không tìm thấy phiếu khảo sát." },
        { status: 404 }
      );
    }

    return NextResponse.json({ survey: data.payload });
  } catch (e: any) {
    console.error("survey GET error:", e);
    return NextResponse.json(
      { error: "Lỗi server khi đọc phiếu khảo sát." },
      { status: 500 }
    );
  }
}
