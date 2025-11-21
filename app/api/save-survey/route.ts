// File: app/api/save-survey/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Hàm tạo ID ngẫu nhiên 6 ký tự
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

    if (!payload) return NextResponse.json({ error: "Không có dữ liệu" }, { status: 400 });

    const shortId = generateShortId();

    // Ghi vào bảng 'surveys' (Khớp với ảnh số 2 bạn gửi)
    // Cột: short_id, payload
    const { error } = await supabase
      .from("surveys")
      .insert([{ short_id: shortId, payload: payload }]);

    if (error) throw error;

    return NextResponse.json({ ok: true, shortId: shortId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}