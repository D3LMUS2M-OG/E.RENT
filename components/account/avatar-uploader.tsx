"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { removeAvatar, setAvatar } from "@/app/account/actions";

const MAX_BYTES = 8 * 1024 * 1024;

/** Centre-crops to a square so a picture is never stretched, and shrinks it to 512 px before it leaves the phone. */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas"); canvas.width = out; canvas.height = out;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out); bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not read the picture"))), "image/jpeg", 0.88));
}

export function AvatarUploader({ userId, name, path }: { userId: string; name: string; path: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Use a JPG, PNG or WebP picture"); return; }
    if (file.size > MAX_BYTES) { setError("Pick a picture under 8 MB"); return; }
    setBusy(true);
    try {
      const blob = await squareJpeg(file);
      const newPath = `${userId}/${crypto.randomUUID()}.jpg`;
      const up = await createClient().storage.from("avatars").upload(newPath, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw new Error(up.error.message);
      const r = await setAvatar(newPath);
      if (r.error) { await createClient().storage.from("avatars").remove([newPath]); throw new Error(r.error); }
      window.dispatchEvent(new Event("erent:profile-changed")); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the picture"); }
    setBusy(false);
  }
  async function remove() {
    setBusy(true); setError("");
    const r = await removeAvatar(); setBusy(false);
    if (r.error) { setError(r.error); return; }
    window.dispatchEvent(new Event("erent:profile-changed")); router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar name={name} path={path} className="size-28 text-3xl ring-4 ring-surface-2" />
        <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={path ? "Change profile picture" : "Add a profile picture"}
          className="absolute -bottom-1 -right-1 inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary)] transition-transform duration-150 active:translate-y-px active:scale-95 disabled:opacity-50">
          <Camera className="size-5" aria-hidden />
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
      </div>
      {busy && <p role="status" className="text-sm text-muted">Saving your picture</p>}
      {path && !busy && <Button type="button" variant="ghost" onClick={remove}><Trash2 className="size-4" aria-hidden />Remove picture</Button>}
      {error && <p role="alert" className="text-center text-sm font-medium">Error: {error}</p>}
    </div>
  );
}
