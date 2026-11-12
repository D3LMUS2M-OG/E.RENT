"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";

/** Home page tile: asks for your location, then searches within 5 km, nearest first. */
export function NearMeTile({ className }: { className?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  function go() {
    setBusy(true); setMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => router.push(`/search?lat=${p.coords.latitude.toFixed(5)}&lng=${p.coords.longitude.toFixed(5)}&sort=distance`),
      () => { setBusy(false); setMsg("Location is off. Allow it in your browser to search near you."); },
      { timeout: 10000 },
    );
  }
  return (
    <button type="button" onClick={go} aria-busy={busy} className={className}>
      <LocateFixed className="size-6 text-accent" aria-hidden />
      <span className="mt-auto block"><b className="block text-lg">Near me</b><span className="text-sm text-muted">{busy ? "Finding you" : msg || "Houses within 5 km"}</span></span>
    </button>
  );
}
