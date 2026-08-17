import { del, get, list, put } from "@vercel/blob";
import type {
  PublicFieldEntry,
  PublicFieldEntryDraft,
  PublicMedia,
} from "../src/field/public";

const ENTRY_PREFIX = "field/entries/";
const MEDIA_PREFIX = "field/media/";
const PUBLISHER_KEY_SHA256 =
  "55ad99638311d52f9febb338f5bc94efea59d365150cea76a10599e992e94615";
const MAX_PUBLIC_MEDIA_BYTES = 4_000_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const EMOTIONS = new Set([
  "joy",
  "tenderness",
  "calm",
  "curiosity",
  "energy",
  "anger",
  "fear",
  "grief",
  "uncertainty",
  "belonging",
]);

type BlobReference = { pathname: string; url: string };
type JsonObject = Record<string, unknown>;

class InputError extends Error {}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(object: JsonObject, key: string, maximum: number): string {
  const value = object[key];
  if (typeof value !== "string" || value.length > maximum) {
    throw new InputError(`Invalid ${key}.`);
  }
  return value;
}

function idValue(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new InputError(`Invalid ${label}.`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InputError(`Invalid ${label}.`);
  }
  if (Math.abs(value) > 1_000_000) throw new InputError(`Invalid ${label}.`);
  return value;
}

function parseDraft(value: unknown): PublicFieldEntryDraft {
  if (!isObject(value)) throw new InputError("Invalid public record.");

  const id = idValue(value.id);
  const happenedAt = stringValue(value, "happenedAt", 64);
  if (!Number.isFinite(new Date(happenedAt).getTime())) {
    throw new InputError("Invalid happenedAt.");
  }
  const text = stringValue(value, "text", 20_000);
  const place = stringValue(value, "place", 1_000);
  if (value.visibility !== "public") {
    throw new InputError("Only public records can reach the shared field.");
  }

  if (!Array.isArray(value.emotions)) throw new InputError("Invalid emotions.");
  const emotions = value.emotions.map((emotion) => {
    if (typeof emotion !== "string" || !EMOTIONS.has(emotion)) {
      throw new InputError("Invalid emotion.");
    }
    return emotion as PublicFieldEntryDraft["emotions"][number];
  });

  if (!Array.isArray(value.media)) throw new InputError("Invalid media.");
  const seenMedia = new Set<string>();
  const media = value.media.map((asset) => {
    if (!isObject(asset)) throw new InputError("Invalid media item.");
    const mediaId = idValue(asset.id, "media id");
    if (seenMedia.has(mediaId)) throw new InputError("Duplicate media id.");
    seenMedia.add(mediaId);
    const type = stringValue(asset, "type", 256);
    if (!allowedMediaType(type))
      throw new InputError("Unsupported media type.");
    return { id: mediaId, type };
  });

  if (!isObject(value.position)) throw new InputError("Invalid position.");
  const position = {
    x: finiteNumber(value.position.x, "position x"),
    y: finiteNumber(value.position.y, "position y"),
    rotate: finiteNumber(value.position.rotate, "position rotate"),
  };

  const draft: PublicFieldEntryDraft = {
    id,
    happenedAt,
    text,
    place,
    visibility: "public",
    emotions,
    media,
    position,
  };

  if (value.updatedAt !== undefined) {
    const updatedAt = stringValue(value, "updatedAt", 64);
    if (!Number.isFinite(new Date(updatedAt).getTime())) {
      throw new InputError("Invalid updatedAt.");
    }
    draft.updatedAt = updatedAt;
  }

  return draft;
}

function allowedMediaType(type: string): boolean {
  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf"
  );
}

function publicMediaName(type: string): string {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "sound";
  if (type === "application/pdf") return "document";
  return "media";
}

function entryPath(id: string): string {
  return `${ENTRY_PREFIX}${id}.json`;
}

function mediaPrefix(id: string): string {
  return `${MEDIA_PREFIX}${id}/`;
}

async function listAll(prefix: string): Promise<BlobReference[]> {
  const blobs: BlobReference[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, limit: 1000, cursor });
    blobs.push(
      ...result.blobs.map((blob) => ({
        pathname: blob.pathname,
        url: blob.url,
      })),
    );
    cursor = result.cursor || undefined;
  } while (cursor);
  return blobs;
}

function isStoredPublicEntry(value: unknown): value is PublicFieldEntry {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.happenedAt === "string" &&
    typeof value.text === "string" &&
    typeof value.place === "string" &&
    value.visibility === "public" &&
    Array.isArray(value.emotions) &&
    Array.isArray(value.media) &&
    isObject(value.position)
  );
}

async function publicEntries(): Promise<PublicFieldEntry[]> {
  const blobs = await listAll(ENTRY_PREFIX);
  const entries: PublicFieldEntry[] = [];
  for (const blob of blobs) {
    const result = await get(blob.pathname, {
      access: "public",
      useCache: false,
    });
    if (!result) continue;
    const value = (await new Response(result.stream).json()) as unknown;
    if (isStoredPublicEntry(value)) entries.push(value);
  }
  return entries.sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function authorised(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const key = header.slice("Bearer ".length);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  return constantEqual(bytesToHex(digest), PUBLISHER_KEY_SHA256);
}

async function publish(request: Request): Promise<PublicFieldEntry> {
  const form = await request.formData();
  const rawEntry = form.get("entry");
  if (typeof rawEntry !== "string")
    throw new InputError("Missing public record.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawEntry) as unknown;
  } catch {
    throw new InputError("Invalid public record JSON.");
  }
  const draft = parseDraft(parsed);

  const oldMedia = await listAll(mediaPrefix(draft.id));
  const uploaded: PublicMedia[] = [];
  let totalBytes = 0;

  for (const descriptor of draft.media) {
    const part = form.get(`media:${descriptor.id}`);
    if (!(part instanceof File)) {
      throw new InputError(`Missing media ${descriptor.id}.`);
    }
    totalBytes += part.size;
    if (totalBytes > MAX_PUBLIC_MEDIA_BYTES) {
      throw new InputError("Public media exceeds the 4 MB record limit.");
    }
    const type = part.type || descriptor.type;
    if (!allowedMediaType(type))
      throw new InputError("Unsupported media type.");

    const blob = await put(`${mediaPrefix(draft.id)}${descriptor.id}`, part, {
      access: "public",
      addRandomSuffix: true,
      contentType: type,
    });
    uploaded.push({
      id: descriptor.id,
      name: publicMediaName(type),
      type,
      url: blob.url,
    });
  }

  const entry: PublicFieldEntry = { ...draft, media: uploaded };
  await put(entryPath(draft.id), JSON.stringify(entry), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  await Promise.all(oldMedia.map((blob) => del(blob.url)));
  return entry;
}

async function unpublish(id: string): Promise<void> {
  const media = await listAll(mediaPrefix(id));
  await Promise.all([
    del(entryPath(id)),
    ...media.map((blob) => del(blob.url)),
  ]);
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method === "GET") {
        return noStore(Response.json({ entries: await publicEntries() }));
      }

      if (request.method !== "PUT" && request.method !== "DELETE") {
        return Response.json({ error: "Method not allowed." }, { status: 405 });
      }

      if (!(await authorised(request))) {
        return Response.json(
          { error: "Publisher key was rejected." },
          { status: 401 },
        );
      }

      if (request.method === "PUT") {
        return noStore(Response.json({ entry: await publish(request) }));
      }

      const id = idValue(new URL(request.url).searchParams.get("id"));
      await unpublish(id);
      return noStore(Response.json({ deleted: id }));
    } catch (error) {
      if (error instanceof InputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      return Response.json(
        { error: "Public field storage is not configured or is unavailable." },
        { status: 503 },
      );
    }
  },
};
