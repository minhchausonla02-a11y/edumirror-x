// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing Supabase env on server", {
      hasUrl: !!url,
      hasKey: !!serviceKey,
    });
    return null;
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}
