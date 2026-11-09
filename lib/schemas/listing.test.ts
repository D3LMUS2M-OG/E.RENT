import { describe, expect, it } from "vitest";
import { listingSchema } from "./listing";

const valid = {
  title: "2 bedroom apartment in Milimani", description: "A bright two bedroom apartment with parking and 24/7 water.",
  property_type_id: "5", rent: "22000", deposit: "22000", county_id: "37", bedrooms: "2", bathrooms: "1",
  available_from: "2026-12-01", units_total: "3", lat: "0.2827", lng: "34.7519",
};

describe("listingSchema", () => {
  it("accepts a valid form post", () => expect(listingSchema.safeParse(valid).success).toBe(true));
  it("rejects a pin outside Kenya", () => expect(listingSchema.safeParse({ ...valid, lat: "51.5", lng: "-0.12" }).success).toBe(false));
  it("treats empty optional numbers as missing", () => {
    const r = listingSchema.safeParse({ ...valid, size_sqm: "", floor: "" });
    expect(r.success && r.data.size_sqm).toBeFalsy();
  });
  it("reads the watermark checkbox", () => {
    const r = listingSchema.safeParse({ ...valid, watermark: "on" });
    expect(r.success && r.data.watermark).toBe(true);
  });
});
