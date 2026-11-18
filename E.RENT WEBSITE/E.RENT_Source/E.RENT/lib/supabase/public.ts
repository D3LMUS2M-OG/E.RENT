import { createClient } from "@supabase/supabase-js";

/** Cookie-free anonymous client for public pages, so they can be statically regenerated (ISR).
 *  Row-level security still applies: it can only see public rows. */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
