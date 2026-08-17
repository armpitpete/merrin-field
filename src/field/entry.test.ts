import { describe, expect, it } from "vitest";
import {
  EMOTIONAL_COLOURS,
  positionForEntry,
  primaryEmotionColour,
  type FieldEntry,
} from "./entry";

function entry(overrides: Partial<FieldEntry> = {}): FieldEntry {
  return {
    id: "entry-1",
    createdAt: "2026-08-17T19:00:00.000Z",
    happenedAt: "2026-08-17T19:00:00.000Z",
    text: "a fragment",
    whyNow: "",
    place: "York",
    importance: 50,
    pinned: false,
    relationships: [],
    visibility: "private",
    emotions: [],
    media: [],
    ...overrides,
  };
}

function distance(position: { x: number; y: number }): number {
  return Math.hypot(position.x, position.y);
}

describe("positionForEntry", () => {
  const now = new Date("2026-08-17T20:00:00.000Z");

  it("keeps more important material closer to the present centre", () => {
    const central = positionForEntry(entry({ importance: 95 }), now);
    const peripheral = positionForEntry(entry({ importance: 10 }), now);
    expect(distance(central)).toBeLessThan(distance(peripheral));
  });

  it("lets pinned material override ordinary distance", () => {
    const pinned = positionForEntry(
      entry({ importance: 10, pinned: true }),
      now,
    );
    const ordinary = positionForEntry(
      entry({ importance: 10, pinned: false }),
      now,
    );
    expect(distance(pinned)).toBeLessThan(distance(ordinary));
  });
});

describe("primaryEmotionColour", () => {
  it("uses the first selected emotional colour as the local accent", () => {
    expect(
      primaryEmotionColour(entry({ emotions: ["tenderness", "curiosity"] })),
    ).toBe(EMOTIONAL_COLOURS.tenderness);
  });

  it("falls back to a neutral accent when no emotion is tagged", () => {
    expect(primaryEmotionColour(entry())).toBe("#6f6a61");
  });
});
