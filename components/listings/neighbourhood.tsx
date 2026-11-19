import { Cross, Footprints, GraduationCap, Landmark, MapPin, ShoppingBag, Bus } from "lucide-react";

export type Place = { id: string; kind: "school" | "hospital" | "stage" | "shopping" | "worship" | "other"; name: string; walk_minutes: number | null };
export const KINDS: Record<Place["kind"], { label: string; plural: string; Icon: typeof MapPin }> = {
  school: { label: "School", plural: "Schools", Icon: GraduationCap }, hospital: { label: "Hospital or clinic", plural: "Hospitals and clinics", Icon: Cross },
  stage: { label: "Matatu stage", plural: "Matatu stages", Icon: Bus }, shopping: { label: "Shops or market", plural: "Shops and markets", Icon: ShoppingBag },
  worship: { label: "Place of worship", plural: "Places of worship", Icon: Landmark }, other: { label: "Other", plural: "Other places", Icon: MapPin },
};

/** What is nearby, as told by the landlord, with walking times. */
export function Neighbourhood({ places }: { places: Place[] }) {
  const groups = (Object.keys(KINDS) as Place["kind"][]).map((k) => [k, places.filter((p) => p.kind === k)] as const).filter(([, p]) => p.length);
  return (
    <section aria-labelledby="near" className="space-y-4">
      <h2 id="near" className="text-2xl">Nearby</h2>
      <div className="grid gap-3 sm:grid-cols-2">{groups.map(([k, ps]) => { const { plural, Icon } = KINDS[k]; return (
        <div key={k} className="rounded-[20px] border border-border bg-surface p-4"><h3 className="flex items-center gap-2 font-sans text-base font-semibold"><Icon className="size-5 text-accent" aria-hidden />{plural}</h3>
          <ul className="mt-2 space-y-1">{ps.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 text-[15px]"><span>{p.name}</span>{p.walk_minutes && <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted"><Footprints className="size-4" aria-hidden />{p.walk_minutes} min</span>}</li>)}</ul></div>); })}</div>
      <p className="text-sm text-muted">Added by the landlord. Check the distances yourself when you visit.</p>
    </section>
  );
}
