import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, legalBySlug } from "./legal";

describe("legal documents", () => {
  it("has the seven documents", () => expect(LEGAL_DOCS.map((d) => d.slug).sort()).toEqual(["acceptable-use", "community-standards", "cookies", "disclaimer", "privacy", "review-policy", "terms"]));
  it("has content in every section", () => { for (const d of LEGAL_DOCS) { expect(d.sections.length).toBeGreaterThan(2); for (const s of d.sections) expect(s.body.length).toBeGreaterThan(0); } });
  it("says no money moves through E.Rent and that deletion is available", () => {
    expect(JSON.stringify(legalBySlug("terms"))).toContain("No money moves through E.Rent");
    expect(JSON.stringify(legalBySlug("privacy"))).toContain("delete your account");
  });
});
