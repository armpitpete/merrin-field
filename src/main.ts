import "./style.css";
import { createLiveTrace } from "./art/liveTrace";
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

// The first sound belongs to the music-working-note region rather than to a
// generic decorative marker. It remains procedural until a real recording is
// available, but its position now has biographical meaning.
const SOUND_SOURCE = { x: -760, y: 690 };

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

function addText(
  parent: SVGGElement,
  text: string,
  x: number,
  y: number,
  className: string,
  options: { rotate?: number; size?: number } = {},
): SVGTextElement {
  const attributes: Record<string, string> = {
    x: String(x),
    y: String(y),
    class: className,
  };
  if (options.size) attributes["font-size"] = String(options.size);
  if (options.rotate) {
    attributes.transform = `rotate(${options.rotate} ${x} ${y})`;
  }

  const element = svgElement("text", attributes);
  element.textContent = text;
  parent.append(element);
  return element;
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app root");

const svg = svgElement("svg", {
  class: "field",
  role: "img",
  "aria-label":
    "An open field of dated working fragments. Drag to move; use the wheel or trackpad to zoom. Sound begins after interaction.",
});

const world = svgElement("g", { class: "world" });

// Geography, not a heading.
addText(world, "YORK", -1590, -60, "landmark");

// Identity is present, but not posed as a logo.
addText(world, "MERRIN", -360, 280, "centre-word");
addText(world, "17 August 2026 · evening", -360, 328, "life-date");

// A real working-note cluster from today. These are not arranged to depict a
// generic object: their geometry comes only from proximity and emphasis.
const music = svgElement("g", {
  class: "working-region music-region",
  transform: "translate(-1030 620) rotate(-5)",
  "aria-label": "Music working notes from 17 August 2026",
});
const musicNote =
  "notes are overlapping, it sounds like an old hymn, emotionless";
const rhythmNote = "the rhythm needs improvement";
const barNote =
  "1 bar could be 1 whole note · 2 half notes · 4 quarter notes · …";
const strongNote = "working-note working-note-strong";
const smallNote = "working-note working-note-small";

addText(music, musicNote, 0, 0, strongNote, { size: 42 });
addText(music, rhythmNote, 155, 86, "working-note", {
  size: 28,
  rotate: 2,
});
addText(music, barNote, 38, 142, smallNote, { size: 20, rotate: -1 });
addText(music, "Invariant Predictive Music", -42, 205, "working-label", {
  size: 15,
});
world.append(music);

// Other things occupying the same day, allowed to remain separate rather than
// being forced into a symbolic portrait.
const language = svgElement("g", {
  class: "working-region",
  transform: "translate(470 -150) rotate(3)",
  "aria-label": "Vaelinya working fragment",
});
addText(language, "A Day Trip to Vaelinya", 0, 0, "working-note", { size: 31 });
addText(language, "Arrival", 74, 48, "working-label", { size: 16 });
world.append(language);

const evidence = svgElement("g", {
  class: "working-region",
  transform: "translate(720 820) rotate(7)",
  "aria-label": "Evidence work fragment",
});
const ledgerNote =
  "party-claimed amount → official amount → accounting state → origin → overlap → strict eligibility";
const faintSmallNote = "working-note working-note-small working-note-faint";

addText(evidence, "Reform's arithmetic", 0, 0, "working-note", { size: 27 });
addText(evidence, ledgerNote, 28, 54, faintSmallNote, { size: 17 });
world.append(evidence);

// The prior state remains as memory, but it is not mistaken for documentary
// life material. It sits lower and quieter than the living fragments.
world.append(createLiveTrace());

// No visible "sound" instruction: the source is spatially attached to the
// music note above and should be discovered through movement.
const soundAnchor = svgElement("circle", {
  cx: String(SOUND_SOURCE.x),
  cy: String(SOUND_SOURCE.y),
  r: "5",
  class: "sound-anchor",
  "aria-hidden": "true",
});
world.append(soundAnchor);

// Peripheral real material replaces the generic "there is more out here" cue.
addText(world, "Lina controlled recolour", 4300, -2550, "far-mark", {
  rotate: -4,
});

svg.append(world);
app.append(svg);

let camera: Camera = { x: 80, y: 110, scale: 0.55 };
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
  camera = { x: 80, y: 110, scale: 0.55 };
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
  if (svg.hasPointerCapture(event.pointerId)) {
    svg.releasePointerCapture(event.pointerId);
  }
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
