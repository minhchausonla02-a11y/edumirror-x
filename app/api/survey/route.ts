import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Không có mã phiếu khảo sát (id)." },
        { status: 400 }
      );
    }

    // ─ Tìm theo short ID trong Supabase
    const { data, error } = await supabaseAdmin
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .single();

    if (error) {
      console.error("Supabase select error:", error);
      return NextResponse.json(
        { error: "Không tìm thấy phiếu khảo sát." },
        { status: 404 }
      );
    }

    if (!data?.payload) {
      return NextResponse.json(
        { error: "Không tìm thấy phiếu khảo sát." },
        { status: 404 }
      );
    }

    // Trả về JSON cho UI hiển thị phiếu
    return NextResponse.json({ survey: data.payload });
  } catch (e: any) {
    console.error("survey route error:", e);
    return NextResponse.json(
      { error: e.message || "Lỗi server." },
      { status: 500 }
    );
  }
}
