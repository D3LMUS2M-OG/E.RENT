"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarInput } from "./stars";
import { refreshReviewPages, submitReview, type ReviewState } from "@/app/reviews/actions";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/reviews";

/** Shrinks a photo to at most 1600 px before upload, which keeps it fast on weak mobile data. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/webp", 0.85));
}

export function ReviewForm({ requestId, kind, listingTitle, listingSlug, isUpdate }: { requestId: string; kind: "rental" | "tour"; listingTitle: string; listingSlug: string; isUpdate?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [files, setFiles] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(0);
  const picker = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  function pick(list: FileList | null) {
    if (!list) return; setPhotoError("");
    const next = [...files, ...Array.from(list)].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (next.some((f) => f.size > 15 * 1024 * 1024)) { setPhotoError("Each photo must be under 15 MB"); return; }
    if (next.length > 3) setPhotoError("You can add up to 3 photos");
    setFiles(next.slice(0, 3));
    if (picker.current) picker.current.value = "";
  }

  // The review exists once the action succeeds. Photos go straight to storage afterwards, then we show the listing.
  useEffect(() => {
    if (!state.ok || !state.id || done.current) return; done.current = true;
    (async () => {
      setUploading(true); let bad = 0;
      if (files.length) {
        try {
          const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
          for (const f of files) {
            try {
              const blob = await shrink(f); const path = `${user!.id}/${state.id}/${crypto.randomUUID()}.webp`;
              const up = await supabase.storage.from("review-photos").upload(path, blob, { contentType: "image/webp" });
              if (up.error) throw up.error;
              const ins = await supabase.from("review_photos").insert({ review_id: state.id, path });
              if (ins.error) throw ins.error;
            } catch (e) { console.error("review photo", e); bad++; }
          }
        } catch (e) { console.error("review photos", e); bad = files.length; }
      }
      await refreshReviewPages(listingSlug).catch(() => {});
      setUploading(false);
      if (bad > 0) { setFailed(bad); return; }   // stay here and say so, instead of hiding the problem
      router.push(`/listing/${listingSlug}#reviews`); router.refresh();
    })();
  }, [state, files, listingSlug, router]);

  const busy = pending || uploading || (Boolean(state.ok) && failed === 0);
  return (
    <form action={action} className="space-y-7" noValidate>
      <input type="hidden" name="request_id" value={requestId} />
      <div className="space-y-2"><p className="text-lg font-semibold">Overall</p><StarInput name="overall" label="Overall rating" required /></div>
      <fieldset className="space-y-1"><legend className="mb-1 text-lg font-semibold">Rate the details <span className="text-sm font-normal text-muted">(optional)</span></legend>
        {CATEGORIES.map(([k, label]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border py-1 last:border-0"><span className="text-[15px]">{label}</span><StarInput name={k} label={label} /></div>))}
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="body" className="text-lg font-semibold">{kind === "rental" ? "What was it like to live here?" : "What did you find when you viewed it?"}</label>
        <textarea id="body" name="body" required minLength={10} maxLength={2000} rows={6} placeholder="Water, security, the neighbours, whether the listing was accurate, how the landlord treated you."
          className="w-full rounded-[18px] border border-border-strong bg-background/60 p-4 text-base placeholder:text-muted" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold">Photos <span className="text-sm font-normal text-muted">(optional, up to 3, house only, no faces)</span></p>
        <ul className="flex flex-wrap gap-3">
          {files.map((f, i) => (
            <li key={i} className="relative"><span className="block size-24 overflow-hidden rounded-2xl border border-border bg-surface">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={URL.createObjectURL(f)} alt={`Selected photo ${i + 1}`} className="size-full object-cover" /></span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="absolute -right-2 -top-2 inline-flex size-8 items-center justify-center rounded-full border border-border-strong bg-surface shadow-[var(--shadow-btn)]"><X className="size-4" aria-hidden /></button></li>))}
          {files.length < 3 && <li><button type="button" onClick={() => picker.current?.click()} className="flex size-24 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border-strong text-sm text-muted transition-colors hover:text-foreground"><ImagePlus className="size-6" aria-hidden />Add</button></li>}
        </ul>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => pick(e.target.files)} />
        {photoError && <p role="alert" className="text-sm font-medium">Error: {photoError}</p>}
      </div>
      <p className="text-sm text-muted">Reviews on <b className="text-foreground">{listingTitle}</b> are public and show your first name and initial. They are not edited by us, so keep them honest and fair.{isUpdate && " This will be shown as an update, and your newest scores replace the older ones in the averages."}</p>
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      {failed > 0 && <p role="alert" className="text-sm font-medium">Your review is posted, but {failed} {failed === 1 ? "photo" : "photos"} could not be added. <a className="text-link underline underline-offset-4" href={`/listing/${listingSlug}#reviews`}>See your review</a></p>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={busy} disabled={failed > 0}>{uploading ? "Adding photos…" : isUpdate ? "Post update" : "Post review"}</Button>
    </form>
  );
}
