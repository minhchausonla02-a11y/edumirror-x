// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateShortId(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const survey = body?.survey;
    if (!survey) {
      return NextResponse.json(
        { error: "Thiếu survey trong body." },
        { status: 400 }
      );
    }

    // sinh short_id và đảm bảo không trùng (thử vài lần)
    let shortId = generateShortId();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("surveys")
        .select("id")
        .eq("short_id", shortId)
        .maybeSingle();
      if (!existing) break;
      shortId = generateShortId();
    }

    const { data, error } = await supabaseAdmin
      .from("surveys")
      .insert({
        short_id: shortId,
        payload: survey,
      })
      .select("short_id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Không lưu được phiếu khảo sát." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.short_id });
  } catch (e: any) {
    console.error("save-survey error:", e);
    return NextResponse.json(
      { error: "Lỗi server khi lưu phiếu khảo sát." },
      { status: 500 }
    );
  }
}
