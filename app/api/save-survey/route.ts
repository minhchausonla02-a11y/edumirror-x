import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Hàm tạo ID ngắn 6 ký tự
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

    // 1. Lấy và làm sạch biến môi trường
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    // 2. Kiểm tra kỹ URL
    if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
      console.error("❌ URL Supabase lỗi:", supabaseUrl);
      return NextResponse.json({ 
        error: "Cấu hình Server lỗi: URL Supabase phải bắt đầu bằng https://" 
      }, { status: 500 });
    }

    if (!supabaseKey) {
      return NextResponse.json({ error: "Server chưa cấu hình Key Supabase" }, { status: 500 });
    }

    // 3. KẾT NỐI (QUAN TRỌNG: Thêm persistSession: false)
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false, // Tắt lưu session để chạy ổn định trên Serverless
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    const shortId = generateShortId();
    console.log(`🔄 Đang lưu vào Supabase bảng 'surveys', ID: ${shortId}`);

    // 4. Thực hiện lưu
    const { data, error } = await supabase
      .from("surveys")
      .insert([
        { short_id: shortId, payload: payload }
      ])
      .select(); // Thêm .select() để đảm bảo lệnh chạy hoàn tất và trả về data

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