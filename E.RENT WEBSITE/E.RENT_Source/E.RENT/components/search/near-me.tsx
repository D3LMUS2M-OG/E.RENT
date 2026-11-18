"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Fills hidden lat and lng inputs, then submits the surrounding form. */
export function NearMeButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  function go(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form!;
    setBusy(true); setMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        (form.elements.namedItem("lat") as HTMLInputElement).value = String(p.coords.latitude);
        (form.elements.namedItem("lng") as HTMLInputElement).value = String(p.coords.longitude);
        (form.elements.namedItem("sort") as HTMLSelectElement).value = "distance";
        form.requestSubmit();
      },
      () => { setBusy(false); setMsg("Location is off. Allow location in your browser to search near you."); },
      { timeout: 10000 },
    );
  }
  return (
    <div>
      <Button type="button" variant="secondary" onClick={go} loading={busy}><LocateFixed className="size-4" aria-hidden />Near me</Button>
      {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
