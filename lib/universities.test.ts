import { describe, expect, it } from "vitest";
import { UNIVERSITIES } from "./universities";

describe("universities", () => {
  it("are all inside Kenya", () => { for (const u of UNIVERSITIES) { expect(u.lat).toBeGreaterThan(-4.8); expect(u.lat).toBeLessThan(5.1); expect(u.lng).toBeGreaterThan(33.8); expect(u.lng).toBeLessThan(42); } });
  it("have unique slugs", () => expect(new Set(UNIVERSITIES.map((u) => u.slug)).size).toBe(UNIVERSITIES.length));
});
