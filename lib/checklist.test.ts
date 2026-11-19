import { describe, expect, it } from "vitest";
import { ALL_KEYS, CHECKLIST } from "./checklist";

describe("move-in checklist", () => {
  it("has unique keys", () => expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length));
  it("covers water, power, security, condition, paperwork and handover", () => expect(CHECKLIST.map((g) => g.id)).toEqual(["water", "power", "security", "condition", "money", "handover"]));
});
