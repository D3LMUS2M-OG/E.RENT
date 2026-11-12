"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SearchRow } from "@/lib/types";
import { KENYA_CENTER, mapStyle } from "./map-style";

/** Clustered pins. Black and white circles, no colour. */
export function ResultsMap({ rows }: { rows: SearchRow[] }) {
  const el = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let dead = false;
    (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (dead || !el.current) return;
      map = new maplibre.Map({ container: el.current, style: mapStyle, center: KENYA_CENTER, zoom: 5.3, cooperativeGestures: true, attributionControl: { compact: true } });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      const geojson = {
        type: "FeatureCollection" as const,
        features: rows.map((r) => ({
          type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
          properties: { slug: r.slug, rent: r.rent, title: r.title },
        })),
      };
      map.on("load", () => {
        if (!map) return;
        map.addSource("listings", { type: "geojson", data: geojson, cluster: true, clusterRadius: 48, clusterMaxZoom: 14 });
        map.addLayer({ id: "clusters", type: "circle", source: "listings", filter: ["has", "point_count"],
          paint: { "circle-color": "#000000", "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "listings", filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"] }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "pins", type: "circle", source: "listings", filter: ["!", ["has", "point_count"]],
          paint: { "circle-color": "#000000", "circle-radius": 8, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });

        map.on("click", "clusters", async (e) => {
          const f = e.features?.[0]; if (!f || !map) return;
          const src = map.getSource("listings") as import("maplibre-gl").GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id);
          map.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom });
        });
        map.on("click", "pins", (e) => { const slug = e.features?.[0]?.properties?.slug; if (slug) router.push(`/listing/${slug}`); });
        for (const layer of ["clusters", "pins"]) {
          map.on("mouseenter", layer, () => { map!.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map!.getCanvas().style.cursor = ""; });
        }
        if (rows.length) {
          const b = new maplibre.LngLatBounds();
          rows.forEach((r) => b.extend([r.lng, r.lat]));
          map.fitBounds(b, { padding: 60, maxZoom: 14, duration: 0 });
        }
      });
    })();
    return () => { dead = true; map?.remove(); };
  }, [rows, router]);

  return <div ref={el} className="h-[70dvh] min-h-96 w-full overflow-hidden rounded-[20px] border border-border bg-surface" role="application" aria-label="Map of search results" />;
}
