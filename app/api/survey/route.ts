// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function GET(req: NextRequest) {
  try {
    // Lấy ?id=... từ URL /api/survey?id=xxxx
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Thiếu id phiếu khảo sát." },
        { status: 400 }
      );
    }

    // DÙNG ĐÚNG CLIENT GIỐNG file save-survey
    // Nếu bên bạn là supabaseAdmin thì giữ nguyên,
    // nếu là "supabase" thì thay tên cho khớp.
    const supabase = supabaseAdmin;

    // TODO: nếu bảng / cột tên khác thì sửa ở đây
    const { data, error } = await supabase
      .from("surveys")        // tên bảng: sửa nếu bạn đang dùng bảng khác
      .select("survey_v2")    // cột chứa JSON phiếu khảo sát
      .eq("short_id", id)     // cột short_id = id trong QR
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
