import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase chưa được cấu hình (thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return supabaseAdmin;
}
