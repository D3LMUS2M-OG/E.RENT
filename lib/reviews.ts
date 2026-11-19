export const REVIEW_PHOTOS = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-photos/${path}`;

export const CATEGORIES = [
  ["condition", "House condition"], ["accuracy", "Listing accuracy"], ["responsiveness", "Landlord responsiveness"],
  ["water", "Water supply"], ["power", "Power supply"], ["road", "Road access"], ["security", "Security"], ["neighbourhood", "Neighbourhood"],
] as const;
export type CategoryKey = (typeof CATEGORIES)[number][0];

export type PublicReview = {
  id: string; listing_id: string; listing_title: string; listing_slug: string; landlord_id: string; kind: "rental" | "tour";
  overall: number; r_condition: number | null; r_accuracy: number | null; r_responsiveness: number | null; r_water: number | null; r_security: number | null; r_neighbourhood: number | null; r_power: number | null; r_road: number | null;
  body: string; created_at: string; author_name: string; author_avatar: string | null; reply_body: string | null; reply_at: string | null; photos: string[]; follow_up: boolean; is_latest: boolean;
};
export type Ratings = { review_count: number; avg_overall: number; avg_condition: number | null; avg_accuracy: number | null; avg_responsiveness: number | null; avg_water: number | null; avg_security: number | null; avg_neighbourhood: number | null };

export const PUBLIC_REVIEW_COLUMNS = "id, listing_id, listing_title, listing_slug, landlord_id, kind, overall, r_condition, r_accuracy, r_responsiveness, r_water, r_security, r_neighbourhood, r_power, r_road, body, created_at, author_name, author_avatar, reply_body, reply_at, photos, follow_up, is_latest";
