// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Nếu bạn dùng anon key thì có thể đổi serviceKey ở trên thành:
// const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn(
    "⚠️ Missing Supabase env vars – app sẽ không lưu survey vào database trong môi trường này."
  );
}

// supabaseAdmin có thể là null nếu chưa cấu hình env
let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && serviceKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export { supabaseAdmin };
