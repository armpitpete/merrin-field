import { describe, expect, it } from "vitest";
import {
  cameraTransform,
  panByScreenDelta,
  screenToWorld,
  zoomAtScreenPoint,
  type Camera,
  type Viewport,
} from "./camera";

const viewport: Viewport = { width: 1000, height: 800 };
const origin: Camera = { x: 0, y: 0, scale: 1 };

describe("camera", () => {
  it("maps the viewport centre to the camera position", () => {
    expect(screenToWorld(origin, viewport, 500, 400)).toEqual({ x: 0, y: 0 });
  });

  it("pans in world units relative to zoom", () => {
    expect(panByScreenDelta({ x: 10, y: 20, scale: 2 }, 100, -40)).toEqual({
      x: -40,
      y: 40,
      scale: 2,
    });
  });

  it("keeps the pointer-anchored world point fixed while zooming", () => {
    const before = screenToWorld(origin, viewport, 700, 500);
    const zoomed = zoomAtScreenPoint(origin, viewport, 700, 500, 2);
    const after = screenToWorld(zoomed, viewport, 700, 500);

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("produces an SVG transform for the camera", () => {
    expect(cameraTransform({ x: 100, y: 50, scale: 2 }, viewport)).toBe(
      "translate(300 300) scale(2)",
    );
  });
});
