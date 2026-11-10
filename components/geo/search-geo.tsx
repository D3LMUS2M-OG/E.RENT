"use client";

import { useState } from "react";
import { GeoSelect, type GeoValue } from "./geo-select";

export function SearchGeo({ initial }: { initial: GeoValue }) {
  const [v, setV] = useState<GeoValue>(initial);
  return <GeoSelect mode="slug" value={v} onChange={(n) => setV(n)} names={{ county: "county", sub: "sub_county", ward: "ward" }} />;
}
