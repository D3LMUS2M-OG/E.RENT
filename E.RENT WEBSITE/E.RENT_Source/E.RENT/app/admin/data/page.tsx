import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DataList } from "@/components/admin/data-list";

export const metadata = { title: "Platform data" };

export default async function DataPage() {
  await getAccess("/admin/data");
  const supabase = await createClient();
  const [{ data: types }, { data: amenities }] = await Promise.all([
    supabase.from("property_types").select("id, name, slug, is_active").order("sort"),
    supabase.from("amenities").select("id, name, slug, is_active, category").order("category").order("name"),
  ]);
  return (
    <div className="space-y-10">
      <div><h1 className="text-3xl">Platform data</h1><p className="mt-1 max-w-prose text-muted">The house types and amenities landlords can pick, and tenants can filter by. Hiding one keeps old listings intact. Counties and wards are fixed data and are changed with a migration.</p></div>
      <DataList table="property_types" title="House types" hint="Shown in the listing form, search filters and menus." items={types ?? []} />
      <DataList table="amenities" title="Amenities" hint="Shown as icons on listings and in search filters." items={amenities ?? []} />
    </div>
  );
}
