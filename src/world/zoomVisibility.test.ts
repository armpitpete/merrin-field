import { describe, expect, it } from "vitest";
import { zoomBandOpacity } from "./zoomVisibility";

describe("zoomBandOpacity", () => {
  it("is invisible well below a minimum zoom", () => {
    expect(zoomBandOpacity(0.2, { min: 1 })).toBe(0);
  });

  it("is visible inside a bounded zoom band", () => {
    expect(zoomBandOpacity(1, { min: 0.5, max: 2 })).toBeCloseTo(1);
  });

  it("is invisible well above a maximum zoom", () => {
    expect(zoomBandOpacity(4, { max: 1 })).toBe(0);
  });

  it("fades instead of switching abruptly at a boundary", () => {
    const opacity = zoomBandOpacity(1, { min: 1 });
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });
});
