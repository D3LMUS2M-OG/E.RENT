export type SearchRow = {
  id: string; slug: string; title: string; rent: number; deposit: number; bedrooms: number; bathrooms: number;
  property_type: string; county: string; county_slug: string; sub_county: string | null; ward: string | null; estate: string | null;
  lat: number; lng: number; cover_path: string | null; units_available: number; published_at: string;
  managed_by_caretaker: boolean; landlord_verified: boolean; distance_m: number | null; total_count: number;
};

export type ListingStatus =
  | "draft" | "pending_owner_approval" | "active" | "paused" | "rented" | "unavailable" | "expired" | "taken_down";

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft", pending_owner_approval: "Waiting for landlord", active: "Live", paused: "Paused",
  rented: "Rented", unavailable: "Unavailable", expired: "Expired", taken_down: "Taken down",
};
