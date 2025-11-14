import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // giữ nguyên đúng tên client như file save-survey

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu id phiếu khảo sát." },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // ❗ 3 CHỖ NÀY PHẢI KHỚP VỚI file app/api/save-survey/route.ts
    const { data, error } = await supabase
      .from("surveys")        // ✅ TÊN BẢNG – sửa nếu bạn đang dùng bảng khác
      .select("survey_v2")    // ✅ CỘT JSON chứa phiếu khảo sát
      .eq("short_id", id)     // ✅ CỘT chứa short_id
      .single();

    if (error || !data) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Không tìm thấy phiếu khảo sát." },
        { status: 404 }
      );
    }

    return NextResponse.json({ survey_v2: data.survey_v2 }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/survey error:", e);
    return NextResponse.json(
      { error: "Lỗi server khi tải phiếu khảo sát." },
      { status: 500 }
    );
  }
}
