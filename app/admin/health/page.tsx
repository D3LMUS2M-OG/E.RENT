import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Setup check" };

const TABLES: [string, number][] = [
  ["counties", 47], ["sub_counties", 300], ["wards", 1400], ["property_types", 1], ["amenities", 1], ["app_settings", 1],
  ["staff_roles", 1], ["profiles", 1], ["user_roles", 1], ["properties", 0], ["listings", 0], ["listing_media", 0],
  ["contact_shares", 0], ["organization_invites", 0], ["rental_requests", 0], ["tours", 0], ["rentals", 0], ["landlord_verifications", 0], ["verification_documents", 0], ["delegations", 0], ["landlord_profiles", 0],
];
const BUCKETS = ["listing-media", "verification-docs"];

export default async function Health() {
  const supabase = await createClient();
  const tables = await Promise.all(TABLES.map(async ([t, min]) => {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    return { name: t, ok: !error && (count ?? 0) >= min, detail: error ? error.message : `${count ?? 0} rows${min ? ` (expected at least ${min})` : ""}` };
  }));
  const buckets = await Promise.all(BUCKETS.map(async (b) => {
    const { error } = await supabase.storage.from(b).list("", { limit: 1 });
    return { name: b, ok: !error, detail: error ? error.message : "found" };
  }));
  const rpcs = await Promise.all([
    ["search_listings", { filters: {} }], ["my_landlords", {}], ["my_invitations", {}], ["nearest_ward", { p_lat: -0.28, p_lng: 34.75 }], ["contact_states", {}], ["my_org_invites", {}], ["landlord_team", {}], ["incoming_requests", {}], ["my_requests", {}],
  ].map(async ([fn, args]) => {
    const { error } = await supabase.rpc(fn as string, args as object);
    return { name: `${fn}()`, ok: !error, detail: error ? error.message : "works" };
  }));
  const rows = [...tables, ...buckets, ...rpcs];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Setup check</h1>
      <p className="text-muted">Anything marked Missing means a migration or seed file has not run in this Supabase project.</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start justify-between gap-4 p-3">
            <span className="font-medium">{r.name}</span>
            <span className="text-right text-sm"><strong>{r.ok ? "OK" : "Missing"}</strong><span className="block text-muted">{r.detail}</span></span>
          </li>))}
      </ul>
    </div>
  );
}
