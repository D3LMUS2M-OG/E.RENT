import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone } from "./phone";

describe("normalizeKenyanPhone", () => {
  it("accepts the common ways people type a number", () => {
    for (const v of ["0712 345 678", "0712345678", "+254712345678", "254712345678", "0112-345-678"]) expect(normalizeKenyanPhone(v)).toMatch(/^\+254[17]\d{8}$/);
  });
  it("rejects landlines, short numbers and other countries", () => {
    for (const v of ["", "020 123 4567", "071234567", "+447911123456", "abc"]) expect(normalizeKenyanPhone(v)).toBeNull();
  });
});
