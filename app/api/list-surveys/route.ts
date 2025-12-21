import { NextResponse } from "next/server";
// 1. THAY ĐỔI: Dùng bộ kết nối Server mới (đã cấu hình Cookies)
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 2. Khởi tạo Supabase theo phiên làm việc của người dùng
    const supabase = await createClient();

    // 3. Kiểm tra xem ai đang đăng nhập
    const { data: { session } } = await supabase.auth.getSession();

    // Nếu chưa đăng nhập -> Trả về danh sách rỗng (để Dashboard không bị lỗi)
    if (!session) {
      return NextResponse.json({ surveys: [] });
    }

    // 4. Truy vấn dữ liệu (CÓ BỘ LỌC NGƯỜI DÙNG)
    const { data, error } = await supabase
      .from("surveys")
      .select("short_id, payload, created_at")
      .eq("user_id", session.user.id) // <--- QUAN TRỌNG: Chỉ lấy bài của chính mình
      .not("payload", "is", null)     // Giữ nguyên logic cũ: Lọc bỏ phiếu rỗng
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // 5. Xử lý dữ liệu (GIỮ NGUYÊN CODE CŨ CỦA BẠN 100%)
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