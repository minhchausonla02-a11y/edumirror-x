// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Thiếu mã phiếu khảo sát." },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      // Không thấy ENV → không tạo được client
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase chưa được cấu hình trên server, không truy xuất được phiếu khảo sát.",
        },
        { status: 500 }
      );
    }

    // Lấy phiếu từ bảng trong Supabase
    const { data, error } = await supabaseServer
      .from("edumirror_surveys")        // tên bảng
      .select("survey_json")            // cột chứa JSON
      .eq("short_id", id)               // cột ID ngắn
      .single();

    if (error || !data) {
      console.error("[/api/survey] Lỗi Supabase:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "Không tìm thấy phiếu khảo sát hoặc CSDL bị lỗi.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, survey: data.survey_json });
  } catch (err: any) {
    console.error("[/api/survey] Lỗi bất ngờ:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
