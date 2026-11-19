import { describe, expect, it } from "vitest";
import { cleanQuery, describeSearch } from "./saved-search";

describe("cleanQuery", () => {
  it("keeps only search keys and drops page, view and sort", () => expect(cleanQuery("county=kakamega&page=3&view=map&sort=newest&min_bedrooms=2")).toBe("county=kakamega&min_bedrooms=2"));
  it("gives the same text whatever the order", () => expect(cleanQuery("min_bedrooms=2&county=kakamega")).toBe(cleanQuery("county=kakamega&min_bedrooms=2")));
  it("ignores empty values", () => expect(cleanQuery("county=&q=%20")).toBe(""));
});
describe("describeSearch", () => {
  it("writes a readable name", () => expect(describeSearch("county=kakamega&type=bedsitter&min_bedrooms=2&max_rent=25000")).toBe("Kakamega · Bedsitter · 2+ bedrooms · under KES 25,000"));
  it("falls back when nothing is chosen", () => expect(describeSearch("")).toBe("All houses"));
});
