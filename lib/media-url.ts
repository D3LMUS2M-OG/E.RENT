const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-media`;

export const mediaUrl = (path: string) => `${BASE}/${path}`;

/** Photos are stored as {folder}/{id}-480.webp, -960.webp, -1600.webp */
export const variant = (path960: string, w: 480 | 960 | 1600) => path960.replace(/-960\.webp$/, `-${w}.webp`);

export const photoSrcSet = (path960: string) =>
  ([480, 960, 1600] as const).map((w) => `${mediaUrl(variant(path960, w))} ${w}w`).join(", ");
