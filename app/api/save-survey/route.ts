import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Hàm tạo ID ngắn 6 ký tự (Giữ nguyên logic của bạn)
function generateShortId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    // 1. Khởi tạo Supabase với Cookies (để biết ai đang gửi lệnh)
    const supabase = createRouteHandlerClient({ cookies });

    // 2. Kiểm tra xem người dùng đã đăng nhập chưa
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để lưu phiếu!" }, 
        { status: 401 }
      );
    }

    // 3. Lấy dữ liệu từ Client gửi lên
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: "Dữ liệu phiếu bị rỗng" }, { status: 400 });
    }

    const shortId = generateShortId();
    console.log(`🔄 Giáo viên ${session.user.email} đang lưu phiếu, ID: ${shortId}`);

    // 4. Thực hiện lưu vào bảng 'surveys' kèm theo user_id
    const { error } = await supabase
      .from("surveys")
      .insert({
        short_id: shortId,
        payload: payload,
        user_id: session.user.id // <--- QUAN TRỌNG: Đánh dấu chủ sở hữu
      });

    if (error) {
      console.error("❌ Lỗi Supabase:", error);
      return NextResponse.json({ error: "Lỗi Database: " + error.message }, { status: 500 });
    }

    console.log("✅ Lưu thành công!");
    return NextResponse.json({ ok: true, shortId: shortId });

  } catch (error: any) {
    console.error("❌ Lỗi Server:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định" }, { status: 500 });
  }
}