// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  payload?: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.payload) {
      return NextResponse.json(
        { ok: false, error: "Thiếu payload phiếu khảo sát." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const shortId = nanoid(8); // mã ngắn để đưa vào QR

    const { error } = await supabase.from("surveys").insert({
      short_id: shortId,
      payload: body.payload,
    });

    if (error) {
      console.error("❌ Supabase /api/save-survey error:", error);
      return NextResponse.json(
        { ok: false, error: `Lỗi ghi CSDL: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, id: shortId },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Unexpected /api/save-survey error:", err);
    return NextResponse.json(
      { ok: false, error: `Lỗi hệ thống: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
