"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PinMap } from "@/components/map/pin-map";
import { GeoSelect, type Centroid, type GeoValue } from "@/components/geo/geo-select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/app/dashboard/actions";

export type ListingFormValues = {
  title?: string; description?: string; property_type_id?: number; rent?: number; deposit?: number; county_id?: number;
  sub_county_id?: number | null; ward_id?: number | null; estate?: string; bedrooms?: number; bathrooms?: number; size_sqm?: number | null; floor?: number | null;
  available_from?: string; units_total?: number; lat?: number; lng?: number; watermark?: boolean; amenities?: number[]; owner_id?: string;
};
type Option = { id: number; name: string };
type Amenity = Option & { category: string };

const select = "min-h-11 w-full rounded-[14px] border border-border-strong bg-surface px-3 text-base";
const today = () => new Date().toISOString().slice(0, 10);

export function ListingForm({ action, values = {}, types, amenities, submitLabel, owners }: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  values?: ListingFormValues; types: Option[]; amenities: Amenity[]; submitLabel: string;
  owners?: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [pin, setPin] = useState<{ lat?: number; lng?: number }>({ lat: values.lat, lng: values.lng });
  const [geo, setGeo] = useState<GeoValue>({
    county: values.county_id ? String(values.county_id) : "", sub: values.sub_county_id ? String(values.sub_county_id) : "", ward: values.ward_id ? String(values.ward_id) : "",
  });
  const [fly, setFly] = useState<(Centroid & { n: number }) | null>(null);
  const [suggested, setSuggested] = useState("");

  // Dropping a pin suggests the nearest ward. The landlord's own county choice is respected.
  async function onPin(lat: number, lng: number) {
    setPin({ lat, lng });
    const { data } = await createClient().rpc("nearest_ward", { p_lat: lat, p_lng: lng, p_county: geo.county ? Number(geo.county) : null });
    const w = data?.[0];
    if (w) {
      setGeo({ county: String(w.county_id), sub: String(w.sub_county_id), ward: String(w.ward_id) });
      setSuggested(`${w.ward_name}, ${w.sub_county_name}`);
    }
  }
  const fe = state.fieldErrors ?? {};
  const groups = Object.entries(Object.groupBy(amenities, (a) => a.category));
  const chosen = new Set(values.amenities ?? []);

  return (
    <form action={formAction} className="space-y-12" noValidate>
      {owners && owners.length > 1 && (
        <Field label="Posting for" htmlFor="owner_id">
          <select id="owner_id" name="owner_id" className={select} defaultValue={values.owner_id ?? owners[0].id}>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
      )}

      <section className="space-y-5" aria-labelledby="s-details">
        <h2 id="s-details" className="text-xl font-semibold">Details</h2>
        <Field label="Title" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" defaultValue={values.title} placeholder="2 bedroom apartment with parking in Milimani" aria-invalid={!!fe.title} />
        </Field>
        <Field label="Description" htmlFor="description" error={fe.description}>
          <textarea id="description" name="description" rows={5} defaultValue={values.description} aria-invalid={!!fe.description}
            className="w-full rounded-[14px] border border-border-strong bg-surface p-3 text-base aria-[invalid=true]:border-2" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Property type" htmlFor="property_type_id" error={fe.property_type_id}>
            <select id="property_type_id" name="property_type_id" className={select} defaultValue={values.property_type_id ?? ""}>
              <option value="" disabled>Choose a type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Available from" htmlFor="available_from" error={fe.available_from}>
            <Input id="available_from" name="available_from" type="date" defaultValue={values.available_from ?? today()} />
          </Field>
          <Field label="Rent per month (KES)" htmlFor="rent" error={fe.rent}>
            <Input id="rent" name="rent" inputMode="numeric" defaultValue={values.rent} aria-invalid={!!fe.rent} />
          </Field>
          <Field label="Deposit (KES)" htmlFor="deposit" error={fe.deposit}>
            <Input id="deposit" name="deposit" inputMode="numeric" defaultValue={values.deposit ?? 0} />
          </Field>
          <Field label="Bedrooms" htmlFor="bedrooms" error={fe.bedrooms}>
            <Input id="bedrooms" name="bedrooms" inputMode="numeric" defaultValue={values.bedrooms ?? 1} />
          </Field>
          <Field label="Bathrooms" htmlFor="bathrooms" error={fe.bathrooms}>
            <Input id="bathrooms" name="bathrooms" inputMode="numeric" defaultValue={values.bathrooms ?? 1} />
          </Field>
          <Field label="Size (square metres, optional)" htmlFor="size_sqm"><Input id="size_sqm" name="size_sqm" inputMode="numeric" defaultValue={values.size_sqm ?? ""} /></Field>
          <Field label="Floor (optional)" htmlFor="floor"><Input id="floor" name="floor" inputMode="numeric" defaultValue={values.floor ?? ""} /></Field>
          <Field label="Identical units available" htmlFor="units_total" error={fe.units_total}>
            <Input id="units_total" name="units_total" inputMode="numeric" defaultValue={values.units_total ?? 1} />
          </Field>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="s-location">
        <h2 id="s-location" className="text-xl font-semibold">Location</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <GeoSelect mode="id" required value={geo} names={{ county: "county_id", sub: "sub_county_id", ward: "ward_id" }}
            onChange={(v, byUser) => { setGeo(v); if (byUser) setSuggested(""); }}
            onPick={(c) => setFly({ ...c, n: Date.now() })} />
        </div>
        {fe.county_id && <p role="alert" className="text-sm font-medium">Error: {fe.county_id}</p>}
        <Field label="Estate or neighbourhood (optional)" htmlFor="estate"><Input id="estate" name="estate" defaultValue={values.estate} placeholder="For example Milimani" /></Field>
        <div className="space-y-2">
          <p className="text-sm font-medium">Exact pin</p>
          <p className="text-sm text-muted">Tap the map or drag the pin to the house. Tenants see this exact spot.</p>
          <PinMap lat={pin.lat} lng={pin.lng} onChange={onPin} flyTo={fly} />
          {suggested && <p role="status" className="text-sm">Suggested from the pin: {suggested}. Change the ward above if this is wrong.</p>}
          <input type="hidden" name="lat" value={pin.lat ?? ""} />
          <input type="hidden" name="lng" value={pin.lng ?? ""} />
          {(fe.lat || fe.lng) && <p role="alert" className="text-sm font-medium">Error: {fe.lat ?? fe.lng}</p>}
          {pin.lat !== undefined && <p className="text-sm text-muted">{pin.lat.toFixed(5)}, {pin.lng?.toFixed(5)}</p>}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="s-amenities">
        <h2 id="s-amenities" className="text-xl font-semibold">Amenities</h2>
        {groups.map(([cat, list]) => (
          <fieldset key={cat} className="space-y-2">
            <legend className="text-sm font-medium capitalize">{cat}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {list?.map((a) => (
                <label key={a.id} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3">
                  <input type="checkbox" name="amenities" value={a.id} defaultChecked={chosen.has(a.id)} className="size-4 accent-[var(--primary)]" />
                  {a.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3">
          <input type="checkbox" name="watermark" defaultChecked={values.watermark} className="size-4 accent-[var(--primary)]" />
          Add the E.Rent watermark to my photos
        </label>
      </section>

      <div className={cn("sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4")}>
        {state.error && <p role="alert" className="mb-3 text-sm font-medium">Error: {state.error}</p>}
        {state.message && <p role="status" className="mb-3 text-sm font-medium">{state.message}</p>}
        <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}
