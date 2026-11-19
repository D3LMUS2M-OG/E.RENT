import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AgreementBuilder, type ListingOption } from "@/components/dashboard/agreement-builder";

export const metadata = { title: "Rental agreement" };

export default async function AgreementsPage() {
  await getAccess("/dashboard/agreements");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: ls }, { data: me }] = await Promise.all([
    supabase.from("listings").select("id, title, rent, deposit, property:properties(estate, sub_county, county:counties(name))").neq("status", "draft").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
  ]);
  const options: ListingOption[] = (ls ?? []).map((l) => { const p = l.property as unknown as { estate: string | null; sub_county: string | null; county: { name: string } }; return { id: l.id as string, title: l.title as string, rent: l.rent as number, deposit: l.deposit as number, address: [p.estate, p.sub_county, p.county.name].filter(Boolean).join(", ") }; });
  return (
    <div className="space-y-6">
      <div className="no-print"><h1 className="text-3xl">Rental agreement</h1><p className="mt-2 max-w-prose text-muted">Fill in the details and print a plain residential tenancy agreement, or save it as a PDF. Nothing you type here is stored. E.Rent is not a party to the agreement, and the template is a starting point: have an advocate check it before you use it.</p></div>
      <AgreementBuilder listings={options} landlordName={(me?.full_name as string) ?? ""} />
    </div>
  );
}
