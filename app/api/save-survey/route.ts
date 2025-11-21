import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Hàm tạo ID ngẫu nhiên 6 ký tự (để không cần cài thêm thư viện nanoid)
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
    const { payload } = body; // Dữ liệu phiếu khảo sát

    if (!payload) {
      return NextResponse.json({ error: "Không có dữ liệu phiếu" }, { status: 400 });
    }

    // Tạo ID ngắn
    const shortId = generateShortId();

    // Lưu vào bảng 'surveys' trong Supabase
    const { data, error } = await supabase
      .from("surveys")
      .insert([
        { short_id: shortId, payload: payload }
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    // Trả về shortId để tạo QR Code
    return NextResponse.json({ ok: true, shortId: shortId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}