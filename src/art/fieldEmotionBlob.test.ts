import { describe, expect, it } from "vitest";
import { emotionBlobPlacement, emotionBlobRows } from "./fieldEmotionBlob";

describe("emotionBlobPlacement", () => {
  it("lays the first three emotions across one loose row", () => {
    const first = emotionBlobPlacement(0);
    const second = emotionBlobPlacement(1);
    const third = emotionBlobPlacement(2);

    expect(first.y).toBeCloseTo(second.y, -1);
    expect(second.x).toBeGreaterThan(first.x);
    expect(third.x).toBeGreaterThan(second.x);
  });

  it("moves later emotions into another row", () => {
    expect(emotionBlobPlacement(3).y).toBeGreaterThan(
      emotionBlobPlacement(0).y,
    );
  });
});

describe("emotionBlobRows", () => {
  it("groups up to three emotions per row", () => {
    expect(emotionBlobRows(0)).toBe(0);
    expect(emotionBlobRows(1)).toBe(1);
    expect(emotionBlobRows(3)).toBe(1);
    expect(emotionBlobRows(4)).toBe(2);
  });
});
