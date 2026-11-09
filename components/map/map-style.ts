import type { StyleSpecification } from "maplibre-gl";

/** OpenStreetMap raster tiles, desaturated so the map stays in the black, grey and white system.
 *  OSM's public tile server is for light use only. Set NEXT_PUBLIC_MAP_TILES_URL to a paid or self-hosted
 *  OSM-based provider before launch (ADR-005). */
export const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [process.env.NEXT_PUBLIC_MAP_TILES_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -1, "raster-contrast": 0.15 } }],
};

export const KENYA_CENTER: [number, number] = [37.9, 0.2];
