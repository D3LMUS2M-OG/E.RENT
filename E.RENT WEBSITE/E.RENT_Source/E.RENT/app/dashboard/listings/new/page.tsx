import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listings/listing-form";
import { createListing } from "../../actions";

export const metadata = { title: "Add a house" };

export default async function NewListing() {
  const access = await getAccess("/dashboard/listings/new");
  const supabase = await createClient();
  const [types, amenities, owners] = await Promise.all([
    supabase.from("property_types").select("id,name").eq("is_active", true).order("sort"),
    supabase.from("amenities").select("id,name,category").eq("is_active", true).order("id"),
    supabase.rpc("my_landlords"),
  ]);
  const ownerOpts = access.landlordIds.map((id) => ({ id, label: id === access.userId ? "Myself" : (owners.data as { landlord_id: string; display_name: string }[] | null)?.find((o) => o.landlord_id === id)?.display_name || "A landlord" }));

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Add a house</h1>
        <p className="mt-2 text-muted">Fill in the details, then add photos on the next screen. Nothing goes live until you publish.</p>
      </div>
      <ListingForm action={createListing} types={types.data ?? []} amenities={amenities.data ?? []} submitLabel="Save and add photos" owners={ownerOpts} />
    </div>
  );
}
