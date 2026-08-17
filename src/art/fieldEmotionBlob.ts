import { EMOTIONAL_COLOURS, type EmotionalTag } from "../field/entry";

const SVG_NS = "http://www.w3.org/2000/svg";

const BLOB_PATHS = [
  "M -74 -10 C -72 -50 -39 -72 6 -68 C 50 -65 77 -37 74 7 C 71 49 38 70 -6 67 C -48 63 -78 34 -74 -10 Z",
  "M -70 -18 C -58 -58 -22 -73 20 -65 C 60 -57 79 -25 70 17 C 62 56 28 73 -16 66 C -56 58 -80 22 -70 -18 Z",
  "M -77 2 C -74 -41 -46 -68 -4 -70 C 39 -72 73 -48 78 -6 C 82 37 54 68 10 70 C -35 72 -80 46 -77 2 Z",
] as const;

export type EmotionBlobPlacement = {
  x: number;
  y: number;
  rotate: number;
};

export function emotionBlobPlacement(index: number): EmotionBlobPlacement {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const xOffsets = [12, 178, 342] as const;
  const rowNudge = row % 2 === 0 ? 0 : 28;
  const x = xOffsets[column] ?? xOffsets[0];

  return {
    x: x + rowNudge,
    y: 112 + row * 152 + (column === 1 ? 8 : column === 2 ? -5 : 0),
    rotate: [-4, 3, -1][index % 3] ?? 0,
  };
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

export function createFieldEmotionBlob(
  emotion: EmotionalTag,
  index: number,
): SVGGElement {
  const placement = emotionBlobPlacement(index);
  const placed = svgElement("g", {
    class: "field-emotion-blob",
    transform: `translate(${placement.x} ${placement.y}) rotate(${placement.rotate})`,
    role: "img",
    "aria-label": `${emotion} emotional colour`,
  });
  placed.style.setProperty("--emotion-colour", EMOTIONAL_COLOURS[emotion]);

  const scale = svgElement("g", { class: "field-emotion-blob-scale" });
  const shape = svgElement("path", {
    d: BLOB_PATHS[index % BLOB_PATHS.length] ?? BLOB_PATHS[0],
    class: "field-emotion-blob-shape",
  });
  const label = svgElement("text", {
    x: "0",
    y: "1",
    class: "field-emotion-blob-label",
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  label.textContent = emotion;

  scale.append(shape, label);
  placed.append(scale);
  return placed;
}

export function emotionBlobRows(count: number): number {
  return Math.ceil(count / 3);
}
