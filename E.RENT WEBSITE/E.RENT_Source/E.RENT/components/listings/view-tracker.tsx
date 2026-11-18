"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Counts one view per listing per browser per day. No personal data is stored: only a number per listing per day. */
export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    try {
      const key = `viewed:${listingId}:${new Date().toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* private mode: count anyway */ }
    createClient().rpc("record_listing_view", { p_listing: listingId }).then(() => {}, () => {});
  }, [listingId]);
  return null;
}
