// app/api/survey/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lấy danh sách survey (ví dụ cho dashboard)
export async function GET() {
  // Nếu Supabase CHƯA cấu hình → trả danh sách rỗng nhưng không lỗi build
  if (!supabaseAdmin) {
    console.log("📤 Yêu cầu GET /api/survey nhưng Supabase chưa cấu hình.");
    return NextResponse.json(
      {
        ok: true,
        items: [],
        message:
          "Supabase chưa cấu hình, trả danh sách survey rỗng (dùng demo).",
      },
      { status: 200 }
    );
  }

  // Có Supabase → lấy dữ liệu thật trong bảng "surveys"
  const { data, error } = await supabaseAdmin
    .from("surveys") // nếu bảng tên khác thì sửa lại
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Lỗi đọc Supabase:", error);
    return NextResponse.json(
      { ok: false, items: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      items: data ?? [],
    },
    { status: 200 }
  );
}
