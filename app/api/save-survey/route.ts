import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

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
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: "Dữ liệu phiếu bị rỗng" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(); // Xóa khoảng trắng thừa
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    // 1. KIỂM TRA KỸ URL TRƯỚC KHI KẾT NỐI
    if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
      console.error("❌ URL Supabase không hợp lệ:", supabaseUrl);
      return NextResponse.json({ 
        error: "Cấu hình Server lỗi: URL Supabase phải bắt đầu bằng https://" 
      }, { status: 500 });
    }

    if (!supabaseKey) {
      return NextResponse.json({ error: "Server chưa cấu hình Key Supabase" }, { status: 500 });
    }

    // 2. KẾT NỐI
    const supabase = createClient(supabaseUrl, supabaseKey);
    const shortId = generateShortId();

    console.log(`🔄 Đang lưu vào Supabase [${supabaseUrl}]...`);

    const { error } = await supabase
      .from("surveys")
      .insert([{ short_id: shortId, payload: payload }]);

    if (error) {
      console.error("❌ Lỗi Supabase:", error);
      return NextResponse.json({ error: "Lỗi Database: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, shortId: shortId });

  } catch (error: any) {
    console.error("❌ Lỗi Server:", error);
    // Trả về lỗi gốc để dễ debug
    return NextResponse.json({ error: error.message || "Lỗi không xác định" }, { status: 500 });
  }
}