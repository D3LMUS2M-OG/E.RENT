"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFilters } from "@/lib/search";
import { cleanQuery, describeSearch } from "@/lib/saved-search";

export type SaveSearchState = { ok?: boolean; error?: string; name?: string };

/** Saves the search the person is looking at. The alert is on by default; people turn it off on the saved searches page. */
export async function saveSearch(rawQuery: string): Promise<SaveSearchState> {
  const query = cleanQuery(rawQuery);
  if (!query) return { error: "Pick at least one filter first, so we know what to look for." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save a search" };
  const params: Record<string, string | string[]> = {};
  for (const [k, v] of new URLSearchParams(query)) params[k] = k in params ? [...[params[k]].flat(), v] : v;
  const { filters } = parseFilters(params);
  delete filters.limit; delete filters.offset; delete filters.sort;
  const name = describeSearch(query);
  const { error } = await supabase.from("saved_searches").insert({ user_id: user.id, name, query, filters });
  if (error) return { error: error.code === "23505" ? "You already saved this search." : error.message.length < 120 ? error.message : "Could not save the search." };
  revalidatePath("/account/saved-searches");
  return { ok: true, name };
}
