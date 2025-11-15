// app/api/save-survey/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();

  // Nếu chưa cấu hình Supabase → chỉ log và trả OK để demo
  if (!supabaseAdmin) {
    console.log("📥 Survey nhận được (Supabase CHƯA cấu hình):", body);
    return NextResponse.json(
      {
        ok: true,
        stored: false,
        message:
          "Survey nhận được nhưng chưa lưu vào database (Supabase chưa cấu hình).",
      },
      { status: 200 }
    );
  }

  // Nếu có Supabase → lưu vào bảng 'surveys' (tuỳ bạn đặt tên bảng)
  const { data, error } = await supabaseAdmin
    .from("surveys") // nếu bảng tên khác, sửa lại ở đây
    .insert({
      payload: body,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Lỗi lưu Supabase:", error);
    return NextResponse.json(
      { ok: false, stored: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, stored: true, data },
    { status: 200 }
  );
}
