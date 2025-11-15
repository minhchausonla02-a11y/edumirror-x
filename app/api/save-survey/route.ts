// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Sinh shortId (8 ký tự) nếu client chưa gửi
    const shortId: string = body.shortId || nanoid(8);

    let stored = false;
    let dbError: string | null = null;

    // Nếu đã cấu hình Supabase → thử lưu
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("surveys")
        .insert({
          short_id: shortId,
          payload: body,
          created_at: new Date().toISOString(),
        })
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        dbError = error.message;
      } else {
        stored = true;
      }
    }

    // Dù có Supabase hay không, vẫn trả về shortId để client tạo QR
    return NextResponse.json(
      {
        ok: true,
        shortId,
        stored,
        error: dbError,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("save-survey error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
