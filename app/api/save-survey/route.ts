// Import từ file server.ts chúng ta vừa tạo
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    // 1. Khởi tạo Supabase Server Client kiểu mới
    const supabase = await createClient();

    // 2. Kiểm tra session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để lưu phiếu!" }, 
        { status: 401 }
      );
    }

    // 3. Lấy dữ liệu
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: "Dữ liệu phiếu bị rỗng" }, { status: 400 });
    }

    const shortId = generateShortId();
    console.log(`🔄 Giáo viên ${session.user.email} đang lưu phiếu, ID: ${shortId}`);

    // 4. Lưu vào DB
    const { error } = await supabase
      .from("surveys")
      .insert({
        short_id: shortId,
        payload: payload,
        user_id: session.user.id
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