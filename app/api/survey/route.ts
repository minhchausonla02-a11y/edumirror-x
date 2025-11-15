// app/api/survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const urlObj = new URL(req.url);
  const id = urlObj.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Thiếu mã phiếu khảo sát (id)." },
      { status: 400 }
    );
  }

  // Ưu tiên dùng SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trên server
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Supabase chưa cấu hình đúng. Hãy kiểm tra SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trên Vercel.",
      },
      { status: 500 }
    );
  }

  // Một check nhỏ: URL phải chứa "supabase.co"
  if (!supabaseUrl.includes("supabase.co")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Giá trị SUPABASE_URL có vẻ không đúng (không chứa 'supabase.co'). Hãy copy lại Project URL từ Supabase.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from("surveys")
      .select("payload")
      .eq("short_id", id)
      .single();

    if (error) {
      console.error("Supabase /api/survey error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data?.payload) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy phiếu khảo sát trong CSDL." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, survey: data.payload },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Unexpected /api/survey error:", err);
    const msg = err instanceof Error ? `TypeError: ${err.message}` : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
