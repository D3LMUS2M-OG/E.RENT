import { describe, expect, it } from "vitest";
import { buildAgreement, type AgreementInput } from "./agreement";

const base: AgreementInput = { landlordName: "Jane Wanjiru", tenantName: "Peter Otieno", premises: "1 bedroom, Milimani, Kisumu", rent: 12000, deposit: 12000, dueDay: 5, startDate: "2026-12-01", termMonths: 12, noticeDays: 30, utilities: { water: true, electricity: true, garbage: false, security: false }, pets: false, extra: "" };

describe("buildAgreement", () => {
  it("includes the parties, rent and deposit", () => {
    const a = buildAgreement(base); const text = JSON.stringify(a);
    expect(a.intro).toContain("Jane Wanjiru"); expect(a.intro).toContain("Peter Otieno"); expect(text).toContain("KES 12,000"); expect(text).toContain("5th day");
  });
  it("handles a month-to-month tenancy and extra terms", () => {
    const a = buildAgreement({ ...base, termMonths: 0, extra: "Quiet after 10pm." });
    expect(a.clauses[1].text).toContain("month to month"); expect(a.clauses.at(-1)?.heading).toBe("Additional terms");
  });
  it("leaves blanks when a name is missing", () => expect(buildAgreement({ ...base, tenantName: "" }).intro).toContain("____"));
  it("says E.Rent is not a party and that it is not legal advice", () => expect(buildAgreement(base).note).toMatch(/not a party[\s\S]*not legal advice/));
});
