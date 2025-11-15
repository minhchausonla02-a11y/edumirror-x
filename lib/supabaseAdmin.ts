// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Log ra server để dễ debug khi có lỗi
  console.error("❌ Supabase env missing", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey,
  });
} else {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

/** Lấy client Supabase dùng cho API server (service_role) */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase chưa được cấu hình (SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY thiếu)."
    );
  }
  return supabaseAdmin;
}
