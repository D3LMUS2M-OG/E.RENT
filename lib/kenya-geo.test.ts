import { describe, expect, it } from "vitest";
import { KENYA_COUNTY_SHAPES, KENYA_OUTLINE_PATH } from "./kenya-geo";
import { COUNTIES } from "./counties";

describe("county map data", () => {
  it("has one shape for each of the 47 counties", () => { expect(KENYA_COUNTY_SHAPES).toHaveLength(47); expect(KENYA_COUNTY_SHAPES.map((c) => c[0]).sort()).toEqual(COUNTIES.map((c) => c.slug).sort()); });
  it("has an outline", () => expect(KENYA_OUTLINE_PATH.startsWith("M")).toBe(true));
});
