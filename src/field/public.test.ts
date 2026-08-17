import { describe, expect, it } from "vitest";
import type { FieldEntry } from "./entry";
import { toPublicFieldEntryDraft } from "./public";

function fieldEntry(): FieldEntry {
  return {
    id: "entry-1",
    createdAt: "2026-08-17T18:00:00.000Z",
    updatedAt: "2026-08-17T20:30:00.000Z",
    happenedAt: "2026-08-17T18:00:00.000Z",
    text: "public words",
    whyNow: "private composition note",
    place: "York",
    importance: 91,
    pinned: true,
    relationships: ["private relationship name"],
    visibility: "public",
    emotions: ["curiosity", "belonging"],
    media: [
      {
        id: "media-1",
        name: "private-filename.jpg",
        type: "image/jpeg",
        blob: new Blob(["image"], { type: "image/jpeg" }),
      },
    ],
  };
}

describe("public field projection", () => {
  it("publishes only the material needed to render the shared field", () => {
    const projection = toPublicFieldEntryDraft(
      fieldEntry(),
      new Date("2026-08-17T21:00:00.000Z"),
    );

    expect(projection).toMatchObject({
      id: "entry-1",
      happenedAt: "2026-08-17T18:00:00.000Z",
      text: "public words",
      place: "York",
      visibility: "public",
      emotions: ["curiosity", "belonging"],
      media: [{ id: "media-1", type: "image/jpeg" }],
      updatedAt: "2026-08-17T20:30:00.000Z",
    });
    expect(projection.position.x).toBeTypeOf("number");
    expect(projection.position.y).toBeTypeOf("number");
    expect(projection.position.rotate).toBeTypeOf("number");
  });

  it("does not leak browser-only composition metadata or filenames", () => {
    const projection = toPublicFieldEntryDraft(fieldEntry());

    expect(projection).not.toHaveProperty("whyNow");
    expect(projection).not.toHaveProperty("relationships");
    expect(projection).not.toHaveProperty("importance");
    expect(projection).not.toHaveProperty("pinned");
    expect(projection).not.toHaveProperty("createdAt");
    expect(projection.media[0]).not.toHaveProperty("name");
    expect(JSON.stringify(projection)).not.toContain("private-filename.jpg");
    expect(JSON.stringify(projection)).not.toContain(
      "private relationship name",
    );
    expect(JSON.stringify(projection)).not.toContain(
      "private composition note",
    );
  });
});
