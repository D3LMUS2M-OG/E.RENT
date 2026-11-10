import { z } from "zod";

const optInt = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().optional());
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const listingSchema = z.object({
  title: z.string().trim().min(10, "Use at least 10 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().min(30, "Describe the house in at least 30 characters").max(4000),
  property_type_id: int(1, 999),
  rent: int(500, 10_000_000),
  deposit: int(0, 10_000_000).default(0),
  county_id: int(1, 47),
  sub_county_id: optInt,
  ward_id: optInt,
  estate: z.string().trim().max(80).default(""),
  bedrooms: int(0, 20),
  bathrooms: int(0, 20),
  size_sqm: optInt,
  floor: optInt,
  available_from: z.iso.date("Pick the date it becomes available"),
  units_total: int(1, 500),
  // Kenya bounding box: stops a pin dropped in the ocean or another country
  lat: z.coerce.number().min(-4.9, "Drop the pin on the house").max(5.2),
  lng: z.coerce.number().min(33.8).max(42),
  watermark: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  amenities: z.array(z.coerce.number().int()).default([]),
  owner_id: z.string().uuid().optional(),
});

export type ListingInput = z.infer<typeof listingSchema>;

export const MEDIA_RULES = {
  maxPhotos: 7,
  minPhotos: 3,
  maxVideos: 1,
  maxPhotoBytes: 15 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
  maxVideoSeconds: 60,
  minPhotoWidth: 800,
  minPhotoHeight: 500,
} as const;
