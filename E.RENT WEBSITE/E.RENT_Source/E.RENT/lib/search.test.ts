import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parseFilters } from "./search";

describe("parseFilters", () => {
  it("turns URL params into the SQL filter object", () => {
    const { filters } = parseFilters({ county: "nakuru", max_rent: "25,000", min_bedrooms: "2", amenity: ["parking", "wifi"], type: "apartment,maisonette" });
    expect(filters).toMatchObject({ county: "nakuru", max_rent: 25000, min_bedrooms: 2, amenities: ["parking", "wifi"], types: ["apartment", "maisonette"] });
  });
  it("ignores empty and invalid values", () => {
    const { filters } = parseFilters({ county: "", max_rent: "abc", lat: "-0.28" });
    expect(filters.county).toBeUndefined();
    expect(filters.max_rent).toBeUndefined();
    expect(filters.lat).toBeUndefined(); // lat without lng is not a near-me search
  });
  it("paginates and widens the limit for the map view", () => {
    expect(parseFilters({ page: "3" }).filters).toMatchObject({ limit: PAGE_SIZE, offset: PAGE_SIZE * 2 });
    expect(parseFilters({ view: "map" }).filters).toMatchObject({ limit: 200, offset: 0 });
  });
});
