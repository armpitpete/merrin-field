import type { FieldEntry } from "./entry";
import {
  toPublicFieldEntryDraft,
  type PublicFieldEntry,
} from "./public";

const PUBLISHER_KEY_SESSION = "merrin-field-publisher-key";
const PUBLIC_UPLOAD_LIMIT_BYTES = 4_000_000;

async function responseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return new Error(body.error);
  } catch {
    // Keep the fallback when the response is not JSON.
  }
  return new Error(fallback);
}

function publisherKey(): string {
  const remembered = sessionStorage.getItem(PUBLISHER_KEY_SESSION);
  if (remembered) return remembered;

  const entered = window.prompt("Publisher key for Merrin Field")?.trim() ?? "";
  if (!entered) throw new Error("Publishing cancelled.");
  sessionStorage.setItem(PUBLISHER_KEY_SESSION, entered);
  return entered;
}

function authorisation(): string {
  return `Bearer ${publisherKey()}`;
}

function forgetPublisherKey(): void {
  sessionStorage.removeItem(PUBLISHER_KEY_SESSION);
}

function assertPublicUploadSize(entry: FieldEntry): void {
  const totalBytes = entry.media.reduce((sum, asset) => sum + asset.blob.size, 0);
  if (totalBytes > PUBLIC_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      "Public uploads are currently limited to 4 MB per record. Keep this record private/draft or reduce the upload size.",
    );
  }
}

export async function listPublicEntries(): Promise<PublicFieldEntry[]> {
  const response = await fetch("/api/field", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw await responseError(response, "Could not load the shared field.");
  }
  const body = (await response.json()) as { entries?: unknown };
  if (!Array.isArray(body.entries)) return [];
  return body.entries as PublicFieldEntry[];
}

export async function publishEntry(
  entry: FieldEntry,
): Promise<PublicFieldEntry> {
  assertPublicUploadSize(entry);
  const form = new FormData();
  form.set("entry", JSON.stringify(toPublicFieldEntryDraft(entry)));
  for (const asset of entry.media) {
    form.append(`media:${asset.id}`, asset.blob, asset.name);
  }

  const response = await fetch("/api/field", {
    method: "PUT",
    headers: { Authorization: authorisation() },
    body: form,
  });
  if (!response.ok) {
    if (response.status === 401) forgetPublisherKey();
    throw await responseError(response, "Could not publish this record.");
  }

  const body = (await response.json()) as { entry?: PublicFieldEntry };
  if (!body.entry) throw new Error("The shared field returned no record.");
  return body.entry;
}

export async function unpublishEntry(id: string): Promise<void> {
  const response = await fetch(`/api/field?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: authorisation() },
  });
  if (!response.ok) {
    if (response.status === 401) forgetPublisherKey();
    throw await responseError(response, "Could not remove the public record.");
  }
}
