"use client";

import { useEffect, useRef } from "react";
import { LocateFixed } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { KENYA_CENTER, mapStyle } from "./map-style";

type Props = {
  lat?: number | null;
  lng?: number | null;
  /** Editable maps let the landlord drag the pin to the true spot (OSM coverage of estates varies). */
  onChange?: (lat: number, lng: number) => void;
  /** Moves the view (not the pin) when a sub-county or ward is chosen. Change `n` to trigger. */
  flyTo?: { lat: number; lng: number; zoom: number; n: number } | null;
  className?: string;
};

export function PinMap({ lat, lng, onChange, flyTo, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const editable = Boolean(onChange);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (cancelled || !el.current) return;
      const has = typeof lat === "number" && typeof lng === "number";
      const map = new maplibre.Map({
        container: el.current, style: mapStyle, center: has ? [lng!, lat!] : KENYA_CENTER, zoom: has ? 15 : 5.3,
        attributionControl: { compact: true }, cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      const place = (la: number, ln: number) => {
        if (!markerRef.current) {
          markerRef.current = new maplibre.Marker({ color: "#000000", draggable: editable }).setLngLat([ln, la]).addTo(map);
          if (editable) markerRef.current.on("dragend", () => {
            const p = markerRef.current!.getLngLat(); onChangeRef.current?.(p.lat, p.lng);
          });
        } else markerRef.current.setLngLat([ln, la]);
      };
      if (has) place(lat!, lng!);
      if (editable) map.on("click", (e) => { place(e.lngLat.lat, e.lngLat.lng); onChangeRef.current?.(e.lngLat.lat, e.lngLat.lng); });
      (map as unknown as { _place: typeof place })._place = place;
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
    // The map is created once. Later pin changes are applied through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current as (import("maplibre-gl").Map & { _place?: (a: number, b: number) => void }) | null;
    if (map && typeof lat === "number" && typeof lng === "number") { map._place?.(lat, lng); map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) }); }
  }, [lat, lng]);

  useEffect(() => {
    if (flyTo) mapRef.current?.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom, duration: 800 });
  }, [flyTo]);

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (p) => onChangeRef.current?.(p.coords.latitude, p.coords.longitude),
      () => {}, { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div ref={el} className={className ?? "h-72 w-full overflow-hidden rounded-[20px] border border-border bg-surface"} role="application" aria-label={editable ? "Map. Tap or drag the pin to the house" : "Map showing the house location"} />
      {editable && (
        <Button type="button" variant="secondary" onClick={locate}><LocateFixed className="size-4" aria-hidden />Use my current location</Button>
      )}
    </div>
  );
}
