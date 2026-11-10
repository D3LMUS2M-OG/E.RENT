"use client";

import { useEffect, useState } from "react";
import { COUNTIES } from "@/lib/counties";
import { createClient } from "@/lib/supabase/client";

export type GeoValue = { county: string; sub: string; ward: string };
type Sub = { id: number; name: string; slug: string; lat: number | null; lng: number | null };
type Ward = Sub;
export type Centroid = { lat: number; lng: number; zoom: number };

const sel = "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base disabled:opacity-40";

/** County, then sub-county, then ward, loaded on demand so weak connections never download all 1,450 wards.
 *  mode "id" posts database ids (listing form). mode "slug" posts slugs (search and SEO URLs). */
export function GeoSelect({ mode, value, onChange, onPick, names, required, labels }: {
  mode: "id" | "slug";
  value: GeoValue;
  onChange: (v: GeoValue, byUser: boolean) => void;
  onPick?: (c: Centroid) => void;
  names: { county: string; sub: string; ward: string };
  required?: boolean;
  labels?: boolean;
}) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const countyRow = COUNTIES.find((c) => (mode === "id" ? String(c.code) : c.slug) === value.county);
  const key = (r: { id: number; slug: string }) => (mode === "id" ? String(r.id) : r.slug);
  const subRow = subs.find((s) => key(s) === value.sub);

  useEffect(() => {
    let live = true;
    if (!countyRow) { setSubs([]); return; }
    createClient().from("sub_counties").select("id,name,slug,lat,lng").eq("county_id", countyRow.code).order("name")
      .then(({ data }) => { if (live) setSubs((data ?? []) as Sub[]); });
    return () => { live = false; };
  }, [countyRow?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    if (!subRow) { setWards([]); return; }
    createClient().from("wards").select("id,name,slug,lat,lng").eq("sub_county_id", subRow.id).order("name")
      .then(({ data }) => { if (live) setWards((data ?? []) as Ward[]); });
    return () => { live = false; };
  }, [subRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fly = (r: Sub | undefined, zoom: number) => { if (r?.lat != null && r.lng != null) onPick?.({ lat: r.lat, lng: r.lng, zoom }); };
  const L = ({ id, children }: { id: string; children: string }) =>
    labels === false ? <label htmlFor={id} className="sr-only">{children}</label> : <label htmlFor={id} className="mb-1 block text-sm font-medium">{children}</label>;

  return (
    <>
      <div>
        <L id="geo-county">County</L>
        <select id="geo-county" name={names.county} className={sel} required={required} value={value.county}
          onChange={(e) => onChange({ county: e.target.value, sub: "", ward: "" }, true)}>
          <option value="">{required ? "Choose a county" : "All counties"}</option>
          {COUNTIES.map((c) => <option key={c.code} value={mode === "id" ? c.code : c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <L id="geo-sub">Sub-county</L>
        <select id="geo-sub" name={names.sub} className={sel} value={value.sub} disabled={!countyRow}
          onChange={(e) => { onChange({ ...value, sub: e.target.value, ward: "" }, true); fly(subs.find((s) => key(s) === e.target.value), 12); }}>
          <option value="">{countyRow ? "Any sub-county" : "Choose a county first"}</option>
          {subs.map((s) => <option key={s.id} value={key(s)}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <L id="geo-ward">Ward</L>
        <select id="geo-ward" name={names.ward} className={sel} value={value.ward} disabled={!subRow}
          onChange={(e) => { onChange({ ...value, ward: e.target.value }, true); fly(wards.find((w) => key(w) === e.target.value), 14); }}>
          <option value="">{subRow ? "Any ward" : "Choose a sub-county first"}</option>
          {wards.map((w) => <option key={w.id} value={key(w)}>{w.name}</option>)}
        </select>
      </div>
    </>
  );
}
