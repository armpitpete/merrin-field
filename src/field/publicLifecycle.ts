import type { FieldEntry } from "./entry";

export type PublicationPersistence = {
  saveLocal: (entry: FieldEntry) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;
  publish: (entry: FieldEntry) => Promise<unknown>;
  unpublish: (id: string) => Promise<void>;
};

async function rollbackPublicWrite(
  entry: FieldEntry,
  previous: FieldEntry | null,
  persistence: PublicationPersistence,
): Promise<void> {
  if (previous?.visibility === "public") {
    await persistence.publish(previous);
    return;
  }
  await persistence.unpublish(entry.id);
}

export async function persistCreatedEntry(
  entry: FieldEntry,
  persistence: PublicationPersistence,
): Promise<void> {
  if (entry.visibility !== "public") {
    await persistence.saveLocal(entry);
    return;
  }

  await persistence.publish(entry);
  try {
    await persistence.saveLocal(entry);
  } catch {
    try {
      await rollbackPublicWrite(entry, null, persistence);
    } catch {
      throw new Error(
        "The shared field accepted this record, but the browser copy failed and the shared rollback also failed. Public state is uncertain; inspect the shared field before retrying.",
      );
    }
    throw new Error(
      "The browser copy failed, so the new public record was removed from the shared field. Nothing new remains published.",
    );
  }
}

export async function persistUpdatedEntry(
  entry: FieldEntry,
  previous: FieldEntry,
  persistence: PublicationPersistence,
): Promise<void> {
  if (entry.visibility === "public") {
    await persistence.publish(entry);
    try {
      await persistence.saveLocal(entry);
    } catch {
      try {
        await rollbackPublicWrite(entry, previous, persistence);
      } catch {
        throw new Error(
          "The shared field changed, but the browser copy failed and the previous public version could not be restored. Public state is uncertain; inspect the shared field before retrying.",
        );
      }
      throw new Error(
        previous.visibility === "public"
          ? "The browser copy failed, so the previous public version was restored."
          : "The browser copy failed, so this record was removed from the shared field again.",
      );
    }
    return;
  }

  if (previous.visibility === "public") {
    await persistence.unpublish(entry.id);
    try {
      await persistence.saveLocal(entry);
    } catch {
      throw new Error(
        "The shared copy was removed, but the browser-local update failed. The record is no longer public; retry the local save.",
      );
    }
    return;
  }

  await persistence.saveLocal(entry);
}

export async function persistDeletedEntry(
  entry: FieldEntry,
  persistence: PublicationPersistence,
): Promise<void> {
  if (entry.visibility === "public") {
    await persistence.unpublish(entry.id);
    try {
      await persistence.deleteLocal(entry.id);
    } catch {
      throw new Error(
        "The shared copy was removed, but the browser-local delete failed. The record is no longer public; retry deleting the local copy.",
      );
    }
    return;
  }

  await persistence.deleteLocal(entry.id);
}
