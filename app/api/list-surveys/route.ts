import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Lấy tối đa 30 survey gần nhất
    const { data, error } = await supabase
      .from("surveys")
      .select("id, short_id, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Supabase list surveys error:", error);
      return NextResponse.json(
        { ok: false, error: "Không tải được danh sách phiếu khảo sát." },
        { status: 500 }
      );
    }

    // Chuẩn hoá dữ liệu gửi ra FE
    const surveys = (data || []).map((row: any) => {
      const payload = row.payload ?? {};
      const title: string =
        payload.title ||
        payload.surveyTitle ||
        "Phiếu 60s không rõ tiêu đề";

      return {
        id: row.id as number,
        shortId: row.short_id as string,
        title,
        createdAt: row.created_at as string,
      };
    });

    return NextResponse.json({ ok: true, surveys });
  } catch (err: any) {
    console.error("list-surveys API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định." },
      { status: 500 }
    );
  }
}
