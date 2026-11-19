import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FlagKey =
  | "require_phone_verification"
  | "enable_phone_login"
  | "enable_google_login"
  | "enable_sms_notifications"
  | "enable_paid_features"
  | "enable_whatsapp"
  | "enable_student_mode";

const DEFAULTS: Record<FlagKey, boolean> = {
  require_phone_verification: false,
  enable_phone_login: false,
  enable_google_login: false,
  enable_sms_notifications: false,
  enable_paid_features: false,
  enable_whatsapp: false,
  enable_student_mode: false,
};

/** Reads app_settings once per request. Super admin edits it, no deployment needed. */
export const getFlags = cache(async (): Promise<Record<FlagKey, boolean>> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key,value");
    const flags = { ...DEFAULTS };
    for (const row of data ?? []) {
      if (row.key in flags) flags[row.key as FlagKey] = row.value === true;
    }
    return flags;
  } catch {
    return DEFAULTS; // fail closed: every optional feature stays off
  }
});
