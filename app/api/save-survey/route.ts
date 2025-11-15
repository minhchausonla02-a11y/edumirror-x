import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Hàm tạo ID ngắn đơn giản, không cần cài thêm thư viện
function generateShortId(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Luôn tạo 1 mã shortId (dù có Supabase hay không)
    const shortId = generateShortId(8);

    let stored = false;
    let dbError: string | null = null;

    // Nếu có Supabase client thì thử lưu vào bảng "surveys"
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("surveys") // nếu bạn dùng tên bảng khác thì sửa ở đây
          .insert({
            short_id: shortId,
            payload: body,
            created_at: new Date().toISOString(),
          })
          .select("id, short_id")
          .single();

        if (error) {
          console.error("Supabase insert error:", error);
          dbError = error.message;
        } else {
          stored = true;
        }
      } catch (err: any) {
        console.error("Supabase insert exception:", err);
        dbError = err?.message ?? "Unknown Supabase error";
      }
    } else {
      console.log("Supabase not configured, skipping DB insert.");
    }

    // Luôn trả về shortId cho client
    return NextResponse.json(
      {
        ok: true,
        stored,
        shortId,
        short_id: shortId, // để phòng code phía trên dùng tên khác
        dbError,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in /api/save-survey:", err);
    return NextResponse.json(
      {
        ok: false,
        message: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
