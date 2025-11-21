import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs"; // Hoặc 'edge' tuỳ cấu hình, nhưng nodejs an toàn hơn
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // Lấy id từ ?id=...

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phiếu" }, { status: 400 });
    }

    // Tìm trong Supabase xem có short_id nào trùng không
    const { data, error } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Không tìm thấy phiếu khảo sát này" }, { status: 404 });
    }

    // Trả về dữ liệu phiếu (survey_v2)
    return NextResponse.json({ survey_v2: data.payload });
  } catch (error: any) {
    console.error("Get Survey Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}