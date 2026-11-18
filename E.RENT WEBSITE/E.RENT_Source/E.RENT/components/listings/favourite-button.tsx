"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function FavouriteButton({ listingId, iconOnly = false }: { listingId: string; iconOnly?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUid(data.user.id);
      const { data: row } = await supabase.from("favourites").select("listing_id").eq("listing_id", listingId).maybeSingle();
      setSaved(Boolean(row));
    });
  }, [listingId]);

  async function toggle() {
    if (!uid) { router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`); return; }
    const supabase = createClient();
    const next = !saved;
    setSaved(next); // optimistic
    const { error } = next
      ? await supabase.from("favourites").insert({ user_id: uid, listing_id: listingId })
      : await supabase.from("favourites").delete().eq("listing_id", listingId).eq("user_id", uid);
    if (error) setSaved(!next);
  }

  if (iconOnly) {
    return (
      <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? "Remove from saved houses" : "Save this house"}
        className="inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-background/85 text-foreground shadow-[var(--shadow-btn)] backdrop-blur transition-[transform,background-color] duration-150 hover:bg-surface-2 active:translate-y-px active:scale-95">
        <Heart className={saved ? "size-5 fill-primary text-primary" : "size-5"} aria-hidden />
      </button>
    );
  }
  return (
    <Button type="button" variant="secondary" onClick={toggle} aria-pressed={saved}>
      <Heart className={saved ? "size-4 fill-current" : "size-4"} aria-hidden />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
