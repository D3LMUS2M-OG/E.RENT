import { describe, expect, it } from "vitest";
import { COUNTIES, countyBySlug } from "./counties";

describe("counties", () => {
  it("has all 47 counties with unique slugs", () => {
    expect(COUNTIES).toHaveLength(47);
    expect(new Set(COUNTIES.map((c) => c.slug)).size).toBe(47);
  });
  it("slugs match the database seed rule", () => {
    expect(countyBySlug("murang'a")).toBeUndefined();
    expect(countyBySlug("murnga")).toBeUndefined();
    expect(countyBySlug("muranga")?.name).toBe("Murang'a");
    expect(countyBySlug("uasin-gishu")?.code).toBe(27);
  });
});
