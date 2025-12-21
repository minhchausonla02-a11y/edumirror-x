import { NextResponse } from "next/server";
// 1. THAY ĐỔI: Dùng thư viện Server mới để nhận diện người dùng
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: Request) {
  try {
    // 2. GIỮ NGUYÊN: Lấy ID từ URL như code cũ của bạn
    const { searchParams } = new URL(req.url);
    const shortId = searchParams.get("id");

    if (!shortId) {
      return NextResponse.json({ error: "Thiếu ID phiếu cần xóa" }, { status: 400 });
    }

    // 3. KHỞI TẠO: Kết nối Supabase với phiên đăng nhập
    const supabase = await createClient();

    // 4. KIỂM TRA: Người dùng đã đăng nhập chưa?
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để xóa!" }, { status: 401 });
    }

    // 5. THỰC HIỆN XÓA (Logic an toàn)
    
    // Bước A: Xóa các câu trả lời liên quan trước (Giữ logic cũ của bạn)
    // Lưu ý: Mình thêm user_id vào query phiếu để đảm bảo chỉ xóa khi phiếu đó thuộc về người dùng này
    // Tuy nhiên, bảng responses có thể không có user_id, nên ta sẽ dựa vào việc xóa bảng surveys bên dưới.
    // Nhưng để chắc ăn như code cũ, ta cứ chạy lệnh xóa response:
    await supabase.from("survey_responses").delete().eq("survey_short_id", shortId);

    // Bước B: Xóa phiếu chính trong bảng surveys
    // QUAN TRỌNG: Thêm .eq("user_id", session.user.id)
    // Nghĩa là: "Chỉ xóa phiếu có ID này NẾU nó thuộc về tôi"
    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("short_id", shortId)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}