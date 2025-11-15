// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && serviceKey) {
  client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
} else {
  // CHỈ cảnh báo, KHÔNG throw – để API không bị sập
  console.warn(
    "Supabase env vars missing. Surveys will not be stored in database."
  );
}

export const supabaseAdmin = client; // có thể null
