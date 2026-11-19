import { describe, expect, it } from "vitest";
import { describeAvailability, responseLabel } from "./availability";

describe("availability", () => {
  it("describes a weekday range", () => expect(describeAvailability({ days: [1, 2, 3, 4, 5], start_time: "08:00:00", end_time: "18:00:00", note: "" })).toBe("Mon to Fri, 8:00 to 18:00"));
  it("lists separate days", () => expect(describeAvailability({ days: [1, 3, 6], start_time: "09:30", end_time: "17:00", note: "" })).toBe("Mon, Wed, Sat, 9:30 to 17:00"));
  it("says every day", () => expect(describeAvailability({ days: [1, 2, 3, 4, 5, 6, 7], start_time: "08:00", end_time: "20:00", note: "" })).toMatch(/^Every day/));
});
describe("responseLabel", () => {
  it("labels fast and slow responders", () => {
    expect(responseLabel(20)).toBe("Replies within 1 hour"); expect(responseLabel(150)).toBe("Replies within 3 hours");
    expect(responseLabel(900)).toBe("Replies within a day"); expect(responseLabel(3000)).toBeNull(); expect(responseLabel(null)).toBeNull();
  });
});
