// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Nếu thiếu env → không tạo client, để code phía sau tự bỏ qua Supabase
let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && serviceKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
} else {
  console.warn("Supabase env vars missing, Supabase disabled.");
}

export { supabaseAdmin };
