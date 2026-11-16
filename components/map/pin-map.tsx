"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DARK_STYLE, KENYA_CENTER, MapMessage, loadGoogleMaps, useMapDark } from "./google-maps";

type Props = {
  lat?: number | null;
  lng?: number | null;
  /** Editable maps let the landlord drag the pin to the true spot. */
  onChange?: (lat: number, lng: number) => void;
  /** Moves the view (not the pin) when a sub-county or ward is chosen. Change `n` to trigger. */
  flyTo?: { lat: number; lng: number; zoom: number; n: number } | null;
  className?: string;
};

export function PinMap({ lat, lng, onChange, flyTo, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const editable = Boolean(onChange);
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const [failed, setFailed] = useState("");
  const dark = useMapDark();

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !el.current) return;
      const has = typeof lat === "number" && typeof lng === "number";
      const map = new maps.Map(el.current, {
        center: has ? { lat: lat!, lng: lng! } : KENYA_CENTER, zoom: has ? 16 : 6, gestureHandling: "cooperative",
        streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false,
      });
      mapRef.current = map;
      const place = (p: google.maps.LatLngLiteral) => {
        if (!markerRef.current) {
          markerRef.current = new maps.Marker({ map, position: p, draggable: editable, animation: maps.Animation.DROP, title: editable ? "Drag to the house" : "The house" });
          if (editable) markerRef.current.addListener("dragend", () => { const q = markerRef.current!.getPosition()!; onChangeRef.current?.(q.lat(), q.lng()); });
        } else markerRef.current.setPosition(p);
      };
      if (has) place({ lat: lat!, lng: lng! });
      if (editable) map.addListener("click", (e: google.maps.MapMouseEvent) => { if (!e.latLng) return; const p = e.latLng.toJSON(); place(p); onChangeRef.current?.(p.lat, p.lng); });
    }).catch((e: Error) => setFailed(e.message));
    return () => { cancelled = true; markerRef.current?.setMap(null); markerRef.current = null; mapRef.current = null; };
    // The map is created once. Later pin changes are applied through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { mapRef.current?.setOptions({ styles: dark ? DARK_STYLE : null }); }, [dark, failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof lat !== "number" || typeof lng !== "number") return;
    const p = { lat, lng };
    if (markerRef.current) markerRef.current.setPosition(p);
    else if (typeof google !== "undefined") markerRef.current = new google.maps.Marker({ map, position: p, draggable: editable });
    map.panTo(p); if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
  }, [lat, lng, editable]);

  useEffect(() => { if (flyTo && mapRef.current) { mapRef.current.panTo({ lat: flyTo.lat, lng: flyTo.lng }); mapRef.current.setZoom(flyTo.zoom); } }, [flyTo]);

  function locate() {
    navigator.geolocation.getCurrentPosition((p) => onChangeRef.current?.(p.coords.latitude, p.coords.longitude), () => {}, { enableHighAccuracy: true, timeout: 10000 });
  }

  return (
    <div className="space-y-2">
      <div className={className ?? "h-72 w-full overflow-hidden rounded-[20px] border border-border bg-surface"} role="application" aria-label={editable ? "Map. Tap or drag the pin to the house" : "Map showing the house location"}>
        {failed ? <MapMessage>{failed === "missing-key" ? "The map is not set up yet (missing Google Maps key)." : "The map could not load. Check your connection and try again."}</MapMessage> : <div ref={el} className="size-full" />}
      </div>
      {editable && <Button type="button" variant="secondary" onClick={locate}><LocateFixed className="size-4" aria-hidden />Use my current location</Button>}
    </div>
  );
}
