import { createClient } from "@supabase/supabase-js";

/** Service-role client. Server code only, for cron jobs and evidence copying. It bypasses row-level security,
 *  so never pass user input into it without checking permissions first. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
