// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  payload?: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.payload) {
      return NextResponse.json(
        { ok: false, error: "Thiếu payload." },
        { status: 400 }
      );
    }

    const short_id = nanoid(8);

    const { data, error } = await supabaseAdmin
      .from("surveys")
      .insert([
        {
          short_id,
          payload: body.payload,
        },
      ])
      .select("short_id")
      .single();

    if (error) {
      console.error("Supabase /api/save-survey error:", error);
      return NextResponse.json(
        { ok: false, error: `Lỗi lưu phiếu: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data.short_id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected /api/save-survey error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Lỗi không xác định",
      },
      { status: 500 }
    );
  }
}
