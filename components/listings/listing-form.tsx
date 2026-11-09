"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PinMap } from "@/components/map/pin-map";
import { COUNTIES } from "@/lib/counties";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/app/dashboard/actions";

export type ListingFormValues = {
  title?: string; description?: string; property_type_id?: number; rent?: number; deposit?: number; county_id?: number;
  sub_county?: string; estate?: string; bedrooms?: number; bathrooms?: number; size_sqm?: number | null; floor?: number | null;
  available_from?: string; units_total?: number; lat?: number; lng?: number; watermark?: boolean; amenities?: number[]; owner_id?: string;
};
type Option = { id: number; name: string };
type Amenity = Option & { category: string };

const select = "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base";
const today = () => new Date().toISOString().slice(0, 10);

export function ListingForm({ action, values = {}, types, amenities, submitLabel, owners }: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  values?: ListingFormValues; types: Option[]; amenities: Amenity[]; submitLabel: string;
  owners?: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [pin, setPin] = useState<{ lat?: number; lng?: number }>({ lat: values.lat, lng: values.lng });
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
            className="w-full rounded-md border border-border-strong bg-background p-3 text-base aria-[invalid=true]:border-2" />
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
          <Field label="County" htmlFor="county_id" error={fe.county_id}>
            <select id="county_id" name="county_id" className={select} defaultValue={values.county_id ?? ""}>
              <option value="" disabled>Choose a county</option>
              {COUNTIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-county" htmlFor="sub_county"><Input id="sub_county" name="sub_county" defaultValue={values.sub_county} /></Field>
          <Field label="Ward or estate" htmlFor="estate"><Input id="estate" name="estate" defaultValue={values.estate} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Exact pin</p>
          <p className="text-sm text-muted">Tap the map or drag the pin to the house. Tenants see this exact spot.</p>
          <PinMap lat={pin.lat} lng={pin.lng} onChange={(lat, lng) => setPin({ lat, lng })} />
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
