import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  payload?: any;      // chính là cấu trúc phiếu 60s (title, items, ...)
  shortId?: string;   // mã rút gọn (nếu không gửi thì tự tạo)
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    // CHỈ kiểm tra theo key payload
    const payload = body.payload;
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Thiếu payload phiếu khảo sát." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const shortId = body.shortId || nanoid(8);

    const { error } = await supabase.from("surveys").insert({
      short_id: shortId,
      payload, // lưu nguyên JSON phiếu 60s
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Lỗi ghi CSDL: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, shortId });
  } catch (err: any) {
    console.error("save-survey route error:", err);
    return NextResponse.json(
      { ok: false, error: "Lỗi không xác định khi lưu phiếu." },
      { status: 500 }
    );
  }
}
