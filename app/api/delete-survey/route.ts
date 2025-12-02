import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: Request) {
  try {
    // Lấy ID từ URL (VD: /api/delete-survey?id=abc12345)
    const { searchParams } = new URL(req.url);
    const shortId = searchParams.get("id");

    if (!shortId) {
        return NextResponse.json({ error: "Thiếu ID phiếu cần xóa" }, { status: 400 });
    }

    // Kết nối Supabase (Dùng quyền Admin để xóa)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Xóa các câu trả lời liên quan trước (nếu có ràng buộc khóa ngoại)
    // (Tùy cấu hình DB, nhưng xóa luôn cho chắc)
    await supabase.from("survey_responses").delete().eq("survey_short_id", shortId);

    // 2. Xóa phiếu chính trong bảng surveys
    const { error } = await supabase.from("surveys").delete().eq("short_id", shortId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}