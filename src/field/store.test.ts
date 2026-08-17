import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { FieldEntry } from "./entry";
import { deleteEntry, listEntries, saveEntry } from "./store";

const DATABASE_NAME = "merrin-field";

function fieldEntry(overrides: Partial<FieldEntry> = {}): FieldEntry {
  return {
    id: "entry-1",
    createdAt: "2026-08-17T18:00:00.000Z",
    happenedAt: "2026-08-17T18:00:00.000Z",
    text: "first record",
    whyNow: "",
    place: "York",
    importance: 60,
    pinned: false,
    relationships: [],
    visibility: "private",
    emotions: ["curiosity"],
    media: [],
    ...overrides,
  };
}

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Could not reset test database"));
    request.onblocked = () => reject(new Error("Test database reset blocked"));
  });
}

describe("field store", () => {
  beforeEach(resetDatabase);

  it("saves and lists a captured record", async () => {
    const entry = fieldEntry();

    await saveEntry(entry);

    await expect(listEntries()).resolves.toEqual([entry]);
  });

  it("updates an existing record instead of creating a duplicate", async () => {
    await saveEntry(fieldEntry());
    await saveEntry(
      fieldEntry({
        text: "changed record",
        updatedAt: "2026-08-17T20:30:00.000Z",
        importance: 88,
      }),
    );

    const entries = await listEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "entry-1",
      text: "changed record",
      updatedAt: "2026-08-17T20:30:00.000Z",
      importance: 88,
    });
  });

  it("deletes only the requested record", async () => {
    await saveEntry(fieldEntry());
    await saveEntry(
      fieldEntry({
        id: "entry-2",
        happenedAt: "2026-08-17T19:00:00.000Z",
        text: "keep this record",
      }),
    );

    await deleteEntry("entry-1");

    const entries = await listEntries();
    expect(entries.map((entry) => entry.id)).toEqual(["entry-2"]);
  });
});
