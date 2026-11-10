"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, MEDIA_RULES } from "@/lib/schemas/listing";
import { processPhoto } from "@/lib/media";

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string };

function flatten(error: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

function parseListing(formData: FormData) {
  const raw: Record<string, unknown> = Object.fromEntries(formData);
  raw.amenities = formData.getAll("amenities");
  return listingSchema.safeParse(raw);
}

const point = (lng: number, lat: number) => `SRID=4326;POINT(${lng} ${lat})`;

// ───────── Create and edit details ─────────
export async function createListing(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseListing(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error), error: "Check the highlighted fields" };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");
  const owner = d.owner_id ?? auth.user.id;

  const { data: prop, error: pe } = await supabase.from("properties").insert({
    owner_id: owner, created_by: auth.user.id, county_id: d.county_id,
    sub_county_id: d.sub_county_id ?? null, ward_id: d.ward_id ?? null, estate: d.estate || null, location: point(d.lng, d.lat),
  }).select("id").single();
  if (pe) return { error: pe.message.includes("sub-county") ? pe.message : "You are not allowed to add a house for this landlord" };

  const { data: listing, error: le } = await supabase.from("listings").insert({
    property_id: prop.id, owner_id: owner, created_by: auth.user.id, property_type_id: d.property_type_id,
    title: d.title, description: d.description, rent: d.rent, deposit: d.deposit, bedrooms: d.bedrooms,
    bathrooms: d.bathrooms, size_sqm: d.size_sqm ?? null, floor: d.floor ?? null, available_from: d.available_from,
    units_total: d.units_total, units_available: d.units_total, watermark: d.watermark, status: "draft", slug: "pending",
  }).select("id").single();
  if (le) {
    await supabase.from("properties").delete().eq("id", prop.id);
    return { error: le.message.includes("row-level security") ? "Add the landlord role to your account first" : le.message };
  }
  if (d.amenities.length) {
    await supabase.from("listing_amenities").insert(d.amenities.map((amenity_id) => ({ listing_id: listing.id, amenity_id })));
  }
  redirect(`/dashboard/listings/${listing.id}/edit?created=1#media`);
}

export async function updateListing(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseListing(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error), error: "Check the highlighted fields" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: cur } = await supabase.from("listings").select("property_id, units_total, units_available").eq("id", id).maybeSingle();
  if (!cur) return { error: "Listing not found" };

  const { error: pe } = await supabase.from("properties").update({
    county_id: d.county_id, sub_county_id: d.sub_county_id ?? null, ward_id: d.ward_id ?? null, estate: d.estate || null, location: point(d.lng, d.lat),
  }).eq("id", cur.property_id);
  if (pe) return { error: pe.message };

  const rented = cur.units_total - cur.units_available;
  const { error: le } = await supabase.from("listings").update({
    property_type_id: d.property_type_id, title: d.title, description: d.description, rent: d.rent, deposit: d.deposit,
    bedrooms: d.bedrooms, bathrooms: d.bathrooms, size_sqm: d.size_sqm ?? null, floor: d.floor ?? null,
    available_from: d.available_from, units_total: d.units_total,
    units_available: Math.max(0, d.units_total - rented), watermark: d.watermark,
  }).eq("id", id);
  if (le) return { error: le.message };

  await supabase.from("listing_amenities").delete().eq("listing_id", id);
  if (d.amenities.length) {
    await supabase.from("listing_amenities").insert(d.amenities.map((amenity_id) => ({ listing_id: id, amenity_id })));
  }
  revalidatePath(`/dashboard/listings/${id}/edit`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}

// ───────── Status changes ─────────
const intents = ["publish", "submit", "approve", "pause", "unavailable", "rent_one", "relist", "renew", "delete"] as const;

export async function changeStatus(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const intent = String(formData.get("intent")) as (typeof intents)[number];
  if (!intents.includes(intent)) return { error: "Unknown action" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: l } = await supabase.from("listings").select("owner_id, status, units_available").eq("id", id).maybeSingle();
  if (!l || !user) return { error: "Listing not found" };
  const isOwner = l.owner_id === user.id;

  let patch: Record<string, unknown> | null = null;
  switch (intent) {
    case "publish":
    case "approve": patch = { status: isOwner ? "active" : "pending_owner_approval" }; break;
    case "submit": patch = { status: "pending_owner_approval" }; break;
    case "pause": patch = { status: "paused" }; break;
    case "unavailable": patch = { status: "unavailable" }; break;
    case "relist": patch = { status: isOwner ? "active" : "pending_owner_approval", expires_at: new Date(Date.now() + 90 * 864e5).toISOString() }; break;
    case "renew": patch = { expires_at: new Date(Date.now() + 90 * 864e5).toISOString() }; break;
    case "rent_one": {
      const left = Math.max(0, l.units_available - 1);
      patch = { units_available: left, ...(left === 0 ? { status: "rented" } : {}) };
      break;
    }
    case "delete": {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) return { error: "Only paused, unavailable, expired, rented or draft listings can be deleted" };
      revalidatePath("/dashboard/listings"); redirect("/dashboard/listings");
    }
  }
  const { error } = await supabase.from("listings").update(patch!).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/listings"); revalidatePath(`/dashboard/listings/${id}/edit`); revalidatePath("/", "layout");
  return { ok: true };
}

// ───────── Media: direct signed uploads, then server-side processing ─────────
type Incoming = { name: string; type: string; size: number };
export type UploadTarget = { path: string; token: string; kind: "photo" | "video"; name: string };

export async function getUploadTargets(listingId: string, files: Incoming[]): Promise<{ targets?: UploadTarget[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again" };
  const { data: media } = await supabase.from("listing_media").select("kind").eq("listing_id", listingId);
  let photos = (media ?? []).filter((m) => m.kind === "photo").length;
  let videos = (media ?? []).filter((m) => m.kind === "video").length;

  const targets: UploadTarget[] = [];
  for (const f of files) {
    const video = f.type.startsWith("video/");
    if (video) {
      if (++videos > MEDIA_RULES.maxVideos) return { error: "A listing can have only one video" };
      if (f.size > MEDIA_RULES.maxVideoBytes) return { error: "Video must be under 50 MB" };
      if (!["video/mp4", "video/webm"].includes(f.type)) return { error: "Use an MP4 or WebM video" };
    } else {
      if (++photos > MEDIA_RULES.maxPhotos) return { error: "A listing can have at most 7 photos" };
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return { error: "Use JPG, PNG or WebP photos" };
      if (f.size > MEDIA_RULES.maxPhotoBytes) return { error: "Each photo must be under 15 MB" };
    }
    const ext = f.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${listingId}/${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from("listing-media").createSignedUploadUrl(path);
    if (error || !data) return { error: "Could not prepare the upload" };
    targets.push({ path, token: data.token, kind: video ? "video" : "photo", name: f.name });
  }
  return { targets };
}

export async function registerMedia(listingId: string, items: { path: string; kind: "photo" | "video" }[]): Promise<{ errors: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { errors: ["Sign in again"] };
  const { data: listing } = await supabase.from("listings").select("watermark").eq("id", listingId).maybeSingle();
  if (!listing) return { errors: ["Listing not found"] };
  const { count } = await supabase.from("listing_media").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  let position = count ?? 0;
  const errors: string[] = [];
  const bucket = supabase.storage.from("listing-media");

  for (const item of items) {
    // Only accept files this user uploaded into their own folder for this listing
    if (!item.path.startsWith(`${user.id}/${listingId}/`)) { errors.push("Invalid file"); continue; }
    try {
      if (item.kind === "video") {
        const { error } = await supabase.from("listing_media").insert({
          listing_id: listingId, kind: "video", path_video: item.path, position: position++, created_by: user.id,
        });
        if (error) throw new Error(error.message);
        continue;
      }
      const { data: blob, error: de } = await bucket.download(item.path);
      if (de || !blob) throw new Error("Upload not found");
      const out = await processPhoto(Buffer.from(await blob.arrayBuffer()), {
        watermark: listing.watermark, minWidth: MEDIA_RULES.minPhotoWidth, minHeight: MEDIA_RULES.minPhotoHeight,
      });
      const base = item.path.replace(/\.[a-z0-9]+$/i, "");
      for (const w of [480, 960, 1600] as const) {
        const { error } = await bucket.upload(`${base}-${w}.webp`, out.variants[w], { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from("listing_media").insert({
        listing_id: listingId, kind: "photo", path_480: `${base}-480.webp`, path_960: `${base}-960.webp`, path_1600: `${base}-1600.webp`,
        blur_data_url: out.blur, phash: out.phash, width: out.width, height: out.height, position: position++, created_by: user.id,
      });
      if (error) throw new Error(error.message);
      await bucket.remove([item.path]); // keep only the optimised variants
    } catch (e) {
      await bucket.remove([item.path]);
      errors.push(e instanceof Error ? e.message : "Upload failed");
    }
  }
  await supabase.rpc("check_listing_duplicates", { p_listing: listingId });
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { errors };
}

export async function deleteMedia(listingId: string, mediaId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: m } = await supabase.from("listing_media").select("path_480,path_960,path_1600,path_video").eq("id", mediaId).eq("listing_id", listingId).maybeSingle();
  const { error } = await supabase.from("listing_media").delete().eq("id", mediaId).eq("listing_id", listingId);
  if (error) return { error: error.message };
  const paths = [m?.path_480, m?.path_960, m?.path_1600, m?.path_video].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("listing-media").remove(paths);
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { ok: true };
}

export async function makeCover(listingId: string, mediaId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("listing_media").select("id").eq("listing_id", listingId).order("position");
  const order = [mediaId, ...(rows ?? []).map((r) => r.id).filter((x) => x !== mediaId)];
  for (let i = 0; i < order.length; i++) await supabase.from("listing_media").update({ position: i }).eq("id", order[i]);
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { ok: true };
}

export async function addLandlordRole(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  await supabase.from("user_roles").upsert({ user_id: user.id, role: "landlord" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  revalidatePath("/account"); revalidatePath("/dashboard");
  redirect("/dashboard");
}
