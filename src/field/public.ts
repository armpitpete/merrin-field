import {
  positionForEntry,
  type EmotionalTag,
  type FieldEntry,
  type FieldPosition,
} from "./entry";

export type PublicMedia = {
  id: string;
  name: string;
  type: string;
  url: string;
};

export type PublicMediaDraft = {
  id: string;
  type: string;
};

export type PublicFieldEntry = {
  id: string;
  happenedAt: string;
  text: string;
  place: string;
  visibility: "public";
  emotions: EmotionalTag[];
  media: PublicMedia[];
  position: FieldPosition;
  updatedAt?: string;
};

export type PublicFieldEntryDraft = Omit<PublicFieldEntry, "media"> & {
  media: PublicMediaDraft[];
};

export function toPublicFieldEntryDraft(
  entry: FieldEntry,
  now = new Date(),
): PublicFieldEntryDraft {
  const draft: PublicFieldEntryDraft = {
    id: entry.id,
    happenedAt: entry.happenedAt,
    text: entry.text,
    place: entry.place,
    visibility: "public",
    emotions: [...entry.emotions],
    media: entry.media.map((asset) => ({ id: asset.id, type: asset.type })),
    position: positionForEntry(entry, now),
  };

  if (entry.updatedAt) draft.updatedAt = entry.updatedAt;
  return draft;
}
