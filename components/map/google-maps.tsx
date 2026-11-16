"use client";

import { useEffect, useState } from "react";

export const KENYA_CENTER = { lat: 0.2, lng: 37.9 };
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let loading: Promise<typeof google.maps> | null = null;

/** Loads the Google Maps JavaScript API once for the whole app. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") return Promise.reject(new Error("server"));
  if (!KEY) return Promise.reject(new Error("missing-key"));
  if (typeof google !== "undefined" && google.maps?.Map) return Promise.resolve(google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = "__erentMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve(google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&callback=${cb}&region=KE&language=en`;
    s.async = true; s.onerror = () => { loading = null; reject(new Error("load-failed")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** A soft dark style for the dark theme (the light theme uses Google's default map). */
export const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a8a8a8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#333333" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a3b32" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a24" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#262626" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1f2a1f" }] },
];

export const isDarkNow = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && !matchMedia("(prefers-color-scheme: light)").matches);

/** Re-renders the map style when the theme changes. */
export function useMapDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const sync = () => setDark(isDarkNow());
    sync(); window.addEventListener("erent:theme", sync);
    return () => window.removeEventListener("erent:theme", sync);
  }, []);
  return dark;
}

export function MapMessage({ children }: { children: React.ReactNode }) {
  return <div className="grid size-full place-items-center p-6 text-center text-sm text-muted">{children}</div>;
}
