import { describe, expect, it } from "vitest";
import { panForSource, presenceForSource } from "./spatialSound";

const source = { x: 1200, y: -420 };

describe("presenceForSource", () => {
  it("gets louder as the camera approaches the source", () => {
    const far = presenceForSource({ x: -1800, y: 900, scale: 0.58 }, source);
    const near = presenceForSource({ x: 900, y: -300, scale: 0.58 }, source);
    expect(near).toBeGreaterThan(far);
  });

  it("gets more present as the visitor zooms in", () => {
    const distantZoom = presenceForSource(
      { x: 900, y: -300, scale: 0.2 },
      source,
    );
    const closeZoom = presenceForSource(
      { x: 900, y: -300, scale: 1.2 },
      source,
    );
    expect(closeZoom).toBeGreaterThan(distantZoom);
  });
});

describe("panForSource", () => {
  it("places a source to the right when it is east of the camera", () => {
    expect(panForSource({ x: 0, y: 0, scale: 1 }, source)).toBeGreaterThan(
      0,
    );
  });

  it("clamps stereo position", () => {
    expect(panForSource({ x: -5000, y: 0, scale: 1 }, source)).toBe(1);
  });
});
