"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchRow } from "@/lib/types";
import { formatKes } from "@/lib/utils";
import { DARK_STYLE, KENYA_CENTER, MapMessage, loadGoogleMaps, useMapDark } from "./google-maps";

const PIN = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42"><path d="M17 1C8.7 1 2 7.5 2 15.6 2 26.4 17 41 17 41s15-14.600 15-25.400C32 7.500 25.300 1 17 1z" fill="#ff4d00" stroke="#111" stroke-width="2"/><circle cx="17" cy="15.500" r="5.500" fill="#111"/></svg>`);

/** Listing pins on Google Maps, grouped into clusters when zoomed out. Tap a pin for the price, tap again to open the house. */
export function ResultsMap({ rows }: { rows: SearchRow[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const router = useRouter();
  const [failed, setFailed] = useState("");
  const dark = useMapDark();

  useEffect(() => {
    let cancelled = false; let clusterer: { clearMarkers: () => void } | undefined; let markers: google.maps.Marker[] = [];
    (async () => {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !el.current) return;
        const map = new maps.Map(el.current, { center: KENYA_CENTER, zoom: 6, gestureHandling: "cooperative", streetViewControl: false, mapTypeControl: false, clickableIcons: false });
        mapRef.current = map; map.setOptions({ styles: dark ? DARK_STYLE : null });
        const info = new maps.InfoWindow();
        markers = rows.map((r) => {
          const m = new maps.Marker({ position: { lat: r.lat, lng: r.lng }, title: r.title, icon: { url: PIN, scaledSize: new maps.Size(34, 42) } });
          m.addListener("click", () => {
            const box = document.createElement("div");
            box.style.cssText = "font:600 14px system-ui;color:#111;padding:2px 4px;min-width:150px";
            const price = document.createElement("div"); price.textContent = `${formatKes(r.rent)} / month`; price.style.cssText = "font-size:16px;color:#b93c00";
            const t = document.createElement("div"); t.textContent = r.title; t.style.cssText = "font-weight:500;margin:2px 0 6px";
            const a = document.createElement("a"); a.textContent = "Open listing"; a.href = `/listing/${r.slug}`; a.style.cssText = "color:#075985;text-decoration:underline";
            a.onclick = (e) => { e.preventDefault(); router.push(`/listing/${r.slug}`); };
            box.append(price, t, a); info.setContent(box); info.open({ map, anchor: m });
          });
          return m;
        });
        const { MarkerClusterer } = await import("@googlemaps/markerclusterer");
        clusterer = new MarkerClusterer({ map, markers });
        if (rows.length) { const b = new maps.LatLngBounds(); rows.forEach((r) => b.extend({ lat: r.lat, lng: r.lng })); map.fitBounds(b, 60); if (rows.length === 1) map.setZoom(15); }
      } catch (e) { setFailed((e as Error).message); }
    })();
    return () => { cancelled = true; clusterer?.clearMarkers(); markers.forEach((m) => m.setMap(null)); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, router]);

  useEffect(() => { mapRef.current?.setOptions({ styles: dark ? DARK_STYLE : null }); }, [dark]);

  return (
    <div className="h-[70dvh] min-h-96 w-full overflow-hidden rounded-[20px] border border-border bg-surface" role="application" aria-label="Map of search results">
      {failed ? <MapMessage>{failed === "missing-key" ? "The map is not set up yet (missing Google Maps key)." : "The map could not load. Check your connection and try again."}</MapMessage> : <div ref={el} className="size-full" />}
    </div>
  );
}
