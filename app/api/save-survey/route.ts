// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  payload?: any;
  id?: string; // nếu frontend có gửi sẵn id thì dùng luôn
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase chưa được cấu hình trên server.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body?.payload) {
      return NextResponse.json(
        { ok: false, error: "Thiếu payload phiếu khảo sát." },
        { status: 400 }
      );
    }

    // Nếu frontend có gửi id thì dùng luôn để khớp với QR,
    // còn không thì tự generate.
    const shortId =
      typeof body.id === "string" && body.id.trim() !== ""
        ? body.id.trim()
        : nanoid(8);

    const { data, error } = await supabase
      .from("surveys")
      .insert({
        short_id: shortId,
        payload: body.payload,
      })
      .select("short_id")
      .single();

    if (error) {
      console.error("Supabase /api/save-survey error:", error);
      return NextResponse.json(
        { ok: false, error: "Lỗi lưu phiếu khảo sát vào CSDL." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data?.short_id ?? shortId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected /api/save-survey error:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
