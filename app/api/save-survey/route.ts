// app/api/save-survey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Hàm sinh shortId ngẫu nhiên (7 ký tự a-zA-Z0-9)
function generateShortId(length: number = 7): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Body rỗng, không có dữ liệu phiếu." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Payload phiếu khảo sát (SurveyV2) – lấy linh hoạt
    const surveyPayload =
      body.survey || body.payload || body.survey_v2 || body;

    // Nếu client đã gửi shortId thì dùng, không thì tự sinh
    let shortId: string =
      body.shortId || body.short_id || body.survey_short_id || "";

    if (!shortId) {
      // Sinh shortId mới, tránh trùng (thử vài lần)
      for (let i = 0; i < 5; i++) {
        const candidate = generateShortId(7);
        const { data, error } = await supabase
          .from("surveys")
          .select("id")
          .eq("short_id", candidate)
          .maybeSingle();

        if (error) {
          console.error("Supabase check short_id error:", error);
          break;
        }
        if (!data) {
          shortId = candidate;
          break;
        }
      }

      if (!shortId) {
        // fallback nếu lỡ tất cả đều trùng (rất hiếm)
        shortId = generateShortId(10);
      }
    }

    // Lưu phiếu vào bảng `surveys`
    const { error } = await supabase.from("surveys").insert({
      short_id: shortId,
      payload: surveyPayload,
    });

    if (error) {
      console.error("Supabase insert error (surveys):", error);
      return NextResponse.json(
        { ok: false, error: "Lưu phiếu khảo sát (mẫu) thất bại." },
        { status: 500 }
      );
    }

    // 🔥 Quan trọng: trả về shortId để front-end tạo QR đúng
    return NextResponse.json({ ok: true, shortId });
  } catch (err: any) {
    console.error("save-survey API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Lỗi không xác định." },
      { status: 500 }
    );
  }
}
