export const EMOTIONAL_COLOURS = {
  joy: "#d39a3a",
  tenderness: "#b97080",
  calm: "#6f927d",
  curiosity: "#607fa0",
  energy: "#c46f3d",
  anger: "#a44d46",
  fear: "#746486",
  grief: "#596573",
  uncertainty: "#948872",
  belonging: "#8b7650",
} as const;

export type EmotionalTag = keyof typeof EMOTIONAL_COLOURS;
export type EntryVisibility = "public" | "private" | "draft";

export type StoredMedia = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
};

export type FieldEntry = {
  id: string;
  createdAt: string;
  happenedAt: string;
  text: string;
  whyNow: string;
  place: string;
  importance: number;
  pinned: boolean;
  relationships: string[];
  visibility: EntryVisibility;
  emotions: EmotionalTag[];
  media: StoredMedia[];
};

export type FieldPosition = {
  x: number;
  y: number;
  rotate: number;
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ageInDays(happenedAt: string, now: Date): number {
  const happened = new Date(happenedAt).getTime();
  if (!Number.isFinite(happened)) return 0;
  return Math.max(0, (now.getTime() - happened) / 86_400_000);
}

export function positionForEntry(
  entry: FieldEntry,
  now = new Date(),
): FieldPosition {
  const clusterKey = entry.relationships[0] ?? entry.place ?? entry.id;
  const clusterHash = stableHash(clusterKey);
  const entryHash = stableHash(entry.id);
  const angle = ((clusterHash % 360) * Math.PI) / 180;
  const ageDistance = Math.min(1300, ageInDays(entry.happenedAt, now) * 0.7);
  const importanceDistance =
    (100 - Math.max(0, Math.min(100, entry.importance))) * 15;
  const radius = entry.pinned ? 260 : 320 + ageDistance + importanceDistance;
  const jitterAngle = (((entryHash % 61) - 30) * Math.PI) / 180;
  const jitterRadius = entryHash % 240;
  const finalAngle = angle + jitterAngle * 0.35;
  const finalRadius = radius + jitterRadius;

  return {
    x: Math.cos(finalAngle) * finalRadius,
    y: Math.sin(finalAngle) * finalRadius,
    rotate: ((entryHash % 17) - 8) * 0.7,
  };
}

export function primaryEmotionColour(
  entry: Pick<FieldEntry, "emotions">,
): string {
  const emotion = entry.emotions[0];
  return emotion ? EMOTIONAL_COLOURS[emotion] : "#6f6a61";
}
