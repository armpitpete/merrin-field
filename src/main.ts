import "./style.css";
import { createLiveTrace } from "./art/liveTrace";
import { createTypographicPortrait } from "./art/typographicPortrait";
import {
  cameraTransform,
  panByScreenDelta,
  zoomAtScreenPoint,
  type Camera,
  type Viewport,
} from "./world/camera";
import { createSpatialSound } from "./world/spatialSound";
import { applyZoomVisibility } from "./world/zoomVisibility";

const SVG_NS = "http://www.w3.org/2000/svg";
const SOUND_SOURCE = { x: 1200, y: -420 };

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

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app root");

const svg = svgElement("svg", {
  class: "field",
  role: "img",
  "aria-label":
    "An open typographic field. Drag to move; use the wheel or trackpad to zoom. Sound begins after interaction.",
});

const defs = svgElement("defs");
const drift = svgElement("path", {
  id: "word-drift",
  d: "M -1320 -680 C -760 -860 -210 -560 250 -610 C 760 -670 1230 -620 1680 -170",
});
defs.append(drift);
svg.append(defs);

const world = svgElement("g", { class: "world" });

const landmark = svgElement("text", {
  x: "-1530",
  y: "-40",
  class: "landmark",
});
landmark.textContent = "YORK";
world.append(landmark);

const driftText = svgElement("text", { class: "drift-text" });
const textPath = svgElement("textPath", {
  href: "#word-drift",
  startOffset: "4%",
});
textPath.textContent =
  "words could form imagery · a change moves the page around · someone's personal space · ";
driftText.append(textPath);
world.append(driftText);

const name = svgElement("text", {
  x: "-430",
  y: "310",
  class: "centre-word",
  "text-anchor": "start",
});
name.textContent = "MERRIN";
world.append(name);

const date = svgElement("text", {
  x: "-430",
  y: "358",
  class: "life-date",
});
date.textContent = "17 August 2026 · evening";
world.append(date);

const fragments: Array<{
  text: string;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  className?: string;
}> = [
  {
    text: "there's no correct answer, it's ART",
    x: -1220,
    y: 720,
    size: 42,
    rotate: -8,
    className: "life-fragment strong",
  },
  {
    text: "unfinished things",
    x: 430,
    y: 840,
    size: 30,
    rotate: 3,
    className: "life-fragment",
  },
  {
    text: "words could form imagery",
    x: 40,
    y: 1380,
    size: 84,
    className: "faint",
  },
  {
    text: "memory",
    x: -1480,
    y: 1120,
    size: 46,
    rotate: -11,
    className: "life-fragment",
  },
];

for (const fragment of fragments) {
  const text = svgElement("text", {
    x: String(fragment.x),
    y: String(fragment.y),
    class: `fragment${fragment.className ? ` ${fragment.className}` : ""}`,
    "font-size": String(fragment.size),
    transform: fragment.rotate
      ? `rotate(${fragment.rotate} ${fragment.x} ${fragment.y})`
      : "",
  });
  text.textContent = fragment.text;
  world.append(text);
}

world.append(createLiveTrace());
world.append(createTypographicPortrait());

const soundMark = svgElement("g", {
  class: "sound-source-mark",
  transform: `translate(${SOUND_SOURCE.x} ${SOUND_SOURCE.y})`,
});
const soundWord = svgElement("text", { x: "0", y: "0", class: "sound-word" });
soundWord.textContent = "sound";
soundMark.append(soundWord);
const soundWhisper = svgElement("text", {
  x: "32",
  y: "42",
  class: "sound-whisper",
});
soundWhisper.textContent = "come closer";
soundMark.append(soundWhisper);
world.append(soundMark);

const farMark = svgElement("text", {
  x: "4600",
  y: "-2800",
  class: "far-mark",
});
farMark.textContent = "there is more out here";
world.append(farMark);

svg.append(world);
app.append(svg);

let camera: Camera = { x: 150, y: 100, scale: 0.55 };
let draggingPointer: number | null = null;
let previousPointer = { x: 0, y: 0 };
const spatialSound = createSpatialSound(SOUND_SOURCE);

function viewport(): Viewport {
  return { width: svg.clientWidth, height: svg.clientHeight };
}

function render(): void {
  world.setAttribute("transform", cameraTransform(camera, viewport()));
  svg.style.setProperty("--camera-scale", String(camera.scale));
  applyZoomVisibility(world, camera.scale);
  spatialSound.update(camera);
}

function home(): void {
  camera = { x: 150, y: 100, scale: 0.55 };
  render();
}

function wakeSound(): void {
  void spatialSound.unlock().then(render);
}

svg.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  wakeSound();
  draggingPointer = event.pointerId;
  previousPointer = { x: event.clientX, y: event.clientY };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("is-dragging");
});

svg.addEventListener("pointermove", (event) => {
  if (draggingPointer !== event.pointerId) return;
  const deltaX = event.clientX - previousPointer.x;
  const deltaY = event.clientY - previousPointer.y;
  previousPointer = { x: event.clientX, y: event.clientY };
  camera = panByScreenDelta(camera, deltaX, deltaY);
  render();
});

function endDrag(event: PointerEvent): void {
  if (draggingPointer !== event.pointerId) return;
  draggingPointer = null;
  svg.classList.remove("is-dragging");
  if (svg.hasPointerCapture(event.pointerId))
    svg.releasePointerCapture(event.pointerId);
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

svg.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    wakeSound();
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const factor = Math.exp(-event.deltaY * 0.0014);
    camera = zoomAtScreenPoint(camera, viewport(), x, y, factor);
    render();
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  wakeSound();
  if (event.key === "Home" || event.key === "0") home();
});

window.addEventListener("resize", render);
render();
