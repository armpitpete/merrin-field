import { describe, expect, it, vi } from "vitest";
import type { FieldEntry } from "./entry";
import {
  persistCreatedEntry,
  persistDeletedEntry,
  persistUpdatedEntry,
  type PublicationPersistence,
} from "./publicLifecycle";

function entry(overrides: Partial<FieldEntry> = {}): FieldEntry {
  return {
    id: "entry-1",
    createdAt: "2026-08-17T18:00:00.000Z",
    happenedAt: "2026-08-17T18:00:00.000Z",
    text: "record",
    whyNow: "",
    place: "York",
    importance: 60,
    pinned: false,
    relationships: [],
    visibility: "private",
    emotions: [],
    media: [],
    ...overrides,
  };
}

function persistence(): PublicationPersistence {
  return {
    saveLocal: vi.fn(async () => undefined),
    deleteLocal: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
    unpublish: vi.fn(async () => undefined),
  };
}

describe("publication lifecycle", () => {
  it("keeps private creation entirely local", async () => {
    const actions = persistence();
    const local = entry({ visibility: "private" });

    await persistCreatedEntry(local, actions);

    expect(actions.saveLocal).toHaveBeenCalledWith(local);
    expect(actions.publish).not.toHaveBeenCalled();
    expect(actions.unpublish).not.toHaveBeenCalled();
  });

  it("rolls back a new public write when the browser copy fails", async () => {
    const actions = persistence();
    const publicEntry = entry({ visibility: "public" });
    vi.mocked(actions.saveLocal).mockRejectedValueOnce(new Error("disk failed"));

    await expect(persistCreatedEntry(publicEntry, actions)).rejects.toThrow(
      "Nothing new remains published",
    );

    expect(actions.publish).toHaveBeenCalledWith(publicEntry);
    expect(actions.unpublish).toHaveBeenCalledWith(publicEntry.id);
  });

  it("restores the previous public version when a public update cannot save locally", async () => {
    const actions = persistence();
    const previous = entry({ visibility: "public", text: "old public" });
    const updated = entry({ visibility: "public", text: "new public" });
    vi.mocked(actions.saveLocal).mockRejectedValueOnce(new Error("disk failed"));

    await expect(
      persistUpdatedEntry(updated, previous, actions),
    ).rejects.toThrow("previous public version was restored");

    expect(actions.publish).toHaveBeenNthCalledWith(1, updated);
    expect(actions.publish).toHaveBeenNthCalledWith(2, previous);
    expect(actions.unpublish).not.toHaveBeenCalled();
  });

  it("removes the shared copy before saving public to private", async () => {
    const calls: string[] = [];
    const actions = persistence();
    vi.mocked(actions.unpublish).mockImplementation(async () => {
      calls.push("unpublish");
    });
    vi.mocked(actions.saveLocal).mockImplementation(async () => {
      calls.push("save-local");
    });
    const previous = entry({ visibility: "public" });
    const updated = entry({ visibility: "private" });

    await persistUpdatedEntry(updated, previous, actions);

    expect(calls).toEqual(["unpublish", "save-local"]);
  });

  it("removes a public record from the shared field before deleting its local copy", async () => {
    const calls: string[] = [];
    const actions = persistence();
    vi.mocked(actions.unpublish).mockImplementation(async () => {
      calls.push("unpublish");
    });
    vi.mocked(actions.deleteLocal).mockImplementation(async () => {
      calls.push("delete-local");
    });

    await persistDeletedEntry(entry({ visibility: "public" }), actions);

    expect(calls).toEqual(["unpublish", "delete-local"]);
  });
});
