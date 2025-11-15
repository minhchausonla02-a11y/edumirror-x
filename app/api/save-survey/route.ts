import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const survey = body.survey;

    if (!survey) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu survey để lưu." },
        { status: 400 }
      );
    }

    // Tạo ID ngắn 8 ký tự cho QR
    const shortId = Math.random().toString(36).slice(2, 10);

    // ─ Lưu vào bảng "surveys"
    const { data, error } = await supabaseAdmin
      .from("surveys")
      .insert({
        short_id: shortId, // dùng đúng cột short_id
        payload: survey,   // JSON phiếu khảo sát
      })
      .select("short_id")
      .single();

    if (error || !data) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Không lưu được phiếu khảo sát." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.short_id });
  } catch (e: any) {
    console.error("save-survey route error:", e);
    return NextResponse.json(
      { error: e.message || "Lỗi server khi lưu phiếu khảo sát." },
      { status: 500 }
    );
  }
}
