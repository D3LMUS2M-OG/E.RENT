"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_RULES } from "@/lib/schemas/listing";
import { mediaUrl } from "@/lib/media-url";
import { deleteMedia, getUploadTargets, makeCover, registerMedia } from "@/app/dashboard/actions";

export type MediaItem = { id: string; kind: "photo" | "video"; path_480: string | null; path_video: string | null; blur_data_url: string | null };

function imageSize(file: File): Promise<{ w: number; h: number }> {
  return createImageBitmap(file).then((b) => { const r = { w: b.width, h: b.height }; b.close(); return r; });
}
function videoSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video"); v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => reject(new Error("Could not read the video")); v.src = URL.createObjectURL(file);
  });
}

export function MediaManager({ listingId, media }: { listingId: string; media: MediaItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [, startTransition] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const photos = media.filter((m) => m.kind === "photo");
  const video = media.find((m) => m.kind === "video");

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true); setErrors([]);
    const problems: string[] = [];
    const ok: File[] = [];
    for (const f of files) {
      try {
        if (f.type.startsWith("video/")) {
          if ((await videoSeconds(f)) > MEDIA_RULES.maxVideoSeconds) throw new Error(`${f.name}: video must be 60 seconds or shorter`);
        } else {
          const { w, h } = await imageSize(f);
          if (w < MEDIA_RULES.minPhotoWidth || h < MEDIA_RULES.minPhotoHeight) throw new Error(`${f.name}: photo is too small, use at least 800 by 500 pixels`);
        }
        ok.push(f);
      } catch (e) { problems.push(e instanceof Error ? e.message : `${f.name}: unreadable file`); }
    }
    if (ok.length) {
      setStatus("Preparing upload");
      const { targets, error } = await getUploadTargets(listingId, ok.map((f) => ({ name: f.name, type: f.type, size: f.size })));
      if (error || !targets) problems.push(error ?? "Upload failed");
      else {
        const supabase = createClient();
        const done: { path: string; kind: "photo" | "video" }[] = [];
        for (let i = 0; i < targets.length; i++) {
          setStatus(`Uploading ${i + 1} of ${targets.length}`);
          const { error: ue } = await supabase.storage.from("listing-media").uploadToSignedUrl(targets[i].path, targets[i].token, ok[i]);
          if (ue) problems.push(`${targets[i].name}: ${ue.message}`); else done.push({ path: targets[i].path, kind: targets[i].kind });
        }
        if (done.length) { setStatus("Optimising photos"); problems.push(...(await registerMedia(listingId, done)).errors); }
      }
    }
    setErrors(problems); setStatus(""); setBusy(false);
    if (photoInput.current) photoInput.current.value = ""; if (videoInput.current) videoInput.current.value = "";
    router.refresh();
  }

  const act = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); router.refresh(); });

  return (
    <section id="media" className="space-y-5" aria-labelledby="s-media">
      <div>
        <h2 id="s-media" className="text-xl font-semibold">Photos and video</h2>
        <p className="mt-1 text-sm text-muted">
          {photos.length} of {MEDIA_RULES.maxPhotos} photos. Add 3 to 7 clear photos of the house and one short walkthrough video.
          Show the house only: no faces or people, no phone numbers, no personal documents.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((m, i) => (
          <li key={m.id} className="overflow-hidden rounded-[20px] border border-border bg-surface">
            <div className="aspect-[4/3] bg-surface bg-cover" style={m.blur_data_url ? { backgroundImage: `url(${m.blur_data_url})` } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m.path_480!)} alt={`Photo ${i + 1}`} loading="lazy" className="size-full object-cover" />
            </div>
            <div className="flex items-center justify-between p-1">
              {i === 0 ? <span className="px-2 text-sm font-medium">Cover</span>
                : <Button type="button" variant="ghost" onClick={() => act(() => makeCover(listingId, m.id))}><Star className="size-4" aria-hidden />Make cover</Button>}
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete photo ${i + 1}`} onClick={() => act(() => deleteMedia(listingId, m.id))}><Trash2 className="size-4" aria-hidden /></Button>
            </div>
          </li>
        ))}
      </ul>

      {video && (
        <div className="flex items-center justify-between rounded-[20px] border border-border bg-surface p-3">
          <span className="flex items-center gap-2 text-sm"><Video className="size-4" aria-hidden />Walkthrough video added</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete video" onClick={() => act(() => deleteMedia(listingId, video.id))}><Trash2 className="size-4" aria-hidden /></Button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(Array.from(e.target.files ?? []))} />
        <input ref={videoInput} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => upload(Array.from(e.target.files ?? []))} />
        <Button type="button" variant="secondary" loading={busy} disabled={photos.length >= MEDIA_RULES.maxPhotos} onClick={() => photoInput.current?.click()}>
          <ImagePlus className="size-4" aria-hidden />Add photos
        </Button>
        <Button type="button" variant="secondary" disabled={busy || Boolean(video)} onClick={() => videoInput.current?.click()}>
          <Video className="size-4" aria-hidden />Add video
        </Button>
      </div>
      {status && <p role="status" className="text-sm">{status}</p>}
      {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm font-medium">{errors.map((e, i) => <li key={i}>Error: {e}</li>)}</ul>}
    </section>
  );
}
