import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SavedSearchList } from "@/components/account/saved-search-list";

export const metadata = { title: "Saved searches", robots: { index: false } };

export default async function SavedSearchesPage() {
  await getAccess("/account/saved-searches");
  const supabase = await createClient();
  const { data } = await supabase.from("saved_searches").select("id, name, query, alert").order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div><h1 className="text-3xl">Saved searches</h1><p className="mt-2 max-w-prose text-muted">We check every hour and tell you when a new house matches. Choose how you hear about it under Account, Notifications.</p></div>
      <SavedSearchList rows={data ?? []} />
    </div>
  );
}
