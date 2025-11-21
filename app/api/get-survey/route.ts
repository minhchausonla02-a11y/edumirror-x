// File: app/api/get-survey/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  // Tìm trong bảng 'surveys' khớp cột short_id (Khớp ảnh số 2)
  const { data, error } = await supabase
    .from("surveys")
    .select("payload")
    .eq("short_id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Phiếu không tồn tại" }, { status: 404 });
  }

  return NextResponse.json({ survey_v2: data.payload });
}