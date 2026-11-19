import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "@/components/dashboard/availability-form";
import { ResponseInfo } from "@/components/landlord/response-badge";
import type { Availability } from "@/lib/availability";

export const metadata = { title: "Profile and hours" };

export default async function DashboardSettings() {
  const a = await getAccess("/dashboard/settings");
  const supabase = await createClient();
  const [{ data: av }, { data: rt }] = await Promise.all([
    supabase.from("landlord_availability").select("days, start_time, end_time, note").eq("user_id", a.userId).maybeSingle(),
    supabase.rpc("landlord_response", { p_landlord: a.userId }),
  ]);
  const initial: Availability = av ?? { days: [1, 2, 3, 4, 5], start_time: "08:00", end_time: "18:00", note: "" };
  const minutes = ((rt ?? []) as { median_minutes: number }[])[0]?.median_minutes ?? null;
  return (
    <div className="max-w-2xl space-y-8">
      <div><h1 className="text-3xl">Profile and hours</h1><p className="mt-2 max-w-prose text-muted">Tenants trust landlords who answer. Tell them when you are around. Your reply speed is worked out from your chats and shown once you have had 3 or more.</p></div>
      <section aria-labelledby="speed" className="space-y-2"><h2 id="speed" className="text-xl">Your reply speed</h2>
        {minutes !== null ? <ResponseInfo minutes={minutes} /> : <p className="text-sm text-muted">Not shown yet. It appears after tenants have started 3 chats with you.</p>}
        {minutes !== null && minutes > 1440 && <p className="text-sm text-muted">Your usual reply takes more than a day, so no badge is shown. Answering sooner earns one.</p>}</section>
      <AvailabilityForm initial={initial} />
      <p className="text-sm text-muted">Your name, photo and verification are in <Link href="/account" className="text-link underline underline-offset-4">your account</Link>.</p>
    </div>
  );
}
