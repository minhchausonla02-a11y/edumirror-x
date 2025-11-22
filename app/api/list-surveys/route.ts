import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Lấy danh sách, nhưng chỉ lấy những phiếu có dữ liệu (không null)
    const { data, error } = await supabase
      .from("surveys")
      .select("short_id, payload, created_at")
      .not("payload", "is", null) // Lọc bỏ phiếu rỗng
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Kiểm tra dữ liệu trước khi trả về
    const validSurveys = data?.map(s => ({
        ...s,
        // Nếu không có tiêu đề thì đặt tên tạm
        title: s.payload?.title || "Phiếu chưa đặt tên",
        // Nếu không có ngày thì lấy ngày hiện tại
        created_at: s.created_at || new Date().toISOString()
    })) || [];

    return NextResponse.json({ surveys: validSurveys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}