// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && serviceKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
} else {
  // Không ném lỗi nữa, chỉ log – để build và QR vẫn chạy bình thường
  console.log(
    "[supabaseAdmin] Supabase env vars not found – running in NO-DB mode."
  );
}

export { supabaseAdmin };
