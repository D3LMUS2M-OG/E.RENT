import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { setFlag } from "./actions";

export const metadata = { title: "Settings and flags" };

const INFO: Record<string, string> = {
  require_phone_verification: "People must verify their phone number before chatting or sending requests.",
  enable_phone_login: "Show phone number sign-in.",
  enable_google_login: "Show Google sign-in (the buttons are always visible today).",
  enable_sms_notifications: "Send SMS notifications (needs an SMS provider).",
  enable_paid_features: "Featured listings and subscriptions (not built yet).",
  enable_whatsapp: "WhatsApp notifications and the WhatsApp share button.",
  enable_student_mode: "Student housing mode with distance to universities.",
  require_staff_mfa: "Staff must use two-step sign-in (authenticator app) to open the admin area. Turn on once every team member has set it up at Account, Privacy and security.",
};

export default async function SettingsPage() {
  const a = await getAccess("/admin/settings");
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value, updated_at").order("key");
  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl">Settings and flags</h1><p className="mt-1 max-w-prose text-muted">Switches that change how the site behaves without a new deployment. Only the super admin can change them, and every change is logged.</p></div>
      <ul className="space-y-2">
        {(data ?? []).map((s) => {
          const on = s.value === true; const bool = typeof s.value === "boolean";
          return (
            <li key={s.key} className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-surface p-4">
              <span className="min-w-0 flex-1"><b className="block font-mono text-sm">{s.key}</b><span className="text-sm text-muted">{INFO[s.key] ?? "Platform setting."}</span></span>
              {!bool ? <code className="text-sm">{JSON.stringify(s.value)}</code> : a.isSuperAdmin
                ? <ActionButton variant={on ? "primary" : "secondary"} action={setFlag.bind(null, s.key, !on)} confirmText={`Turn ${s.key} ${on ? "off" : "on"}?`} aria-pressed={on}>{on ? "On" : "Off"}</ActionButton>
                : <span className="rounded-full border border-border-strong px-3 py-1 text-sm font-semibold">{on ? "On" : "Off"}</span>}
            </li>);
        })}
      </ul>
    </div>
  );
}
