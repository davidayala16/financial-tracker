import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// client component — the service role key bypasses RLS entirely.
export function getServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
