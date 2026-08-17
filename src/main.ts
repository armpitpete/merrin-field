import "./style.css";
import {
  cameraTransform,
  panByScreenDelta,
  zoomAtScreenPoint,
  type Camera,
  type Viewport,
} from "./world/camera";

const SVG_NS = "http://www.w3.org/2000/svg";

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
  "aria-label": "An open typographic field. Drag to move; use the wheel or trackpad to zoom.",
});

const defs = svgElement("defs");
const orbit = svgElement("path", {
  id: "word-orbit",
  d: "M -620 0 C -520 -430 -170 -570 120 -520 C 430 -470 650 -210 600 90 C 550 390 210 560 -130 520 C -460 480 -690 270 -620 0 Z",
});
defs.append(orbit);
svg.append(defs);

const world = svgElement("g", { class: "world" });

const orbitText = svgElement("text", { class: "orbit-text" });
const textPath = svgElement("textPath", {
  href: "#word-orbit",
  startOffset: "2%",
});
textPath.textContent =
  "words become image · image becomes memory · memory changes shape · sound occupies distance · ";
orbitText.append(textPath);
world.append(orbitText);

const centre = svgElement("text", {
  x: "0",
  y: "8",
  class: "centre-word",
  "text-anchor": "middle",
});
centre.textContent = "MERRIN";
world.append(centre);

const fragments: Array<{
  text: string;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  className?: string;
}> = [
  { text: "York", x: -980, y: -460, size: 62 },
  { text: "sound", x: 1120, y: -620, size: 38, rotate: 8 },
  { text: "memory", x: -1240, y: 760, size: 46, rotate: -11 },
  { text: "unfinished things", x: 1380, y: 920, size: 28, rotate: 4 },
  { text: "words", x: 220, y: 1500, size: 86, className: "faint" },
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

const farMark = svgElement("text", {
  x: "4600",
  y: "-2800",
  class: "far-mark",
});
farMark.textContent = "there is more out here";
world.append(farMark);

svg.append(world);
app.append(svg);

let camera: Camera = { x: 0, y: 0, scale: 0.58 };
let draggingPointer: number | null = null;
let previousPointer = { x: 0, y: 0 };

function viewport(): Viewport {
  return { width: svg.clientWidth, height: svg.clientHeight };
}

function render(): void {
  world.setAttribute("transform", cameraTransform(camera, viewport()));
  svg.style.setProperty("--camera-scale", String(camera.scale));
}

function home(): void {
  camera = { x: 0, y: 0, scale: 0.58 };
  render();
}

svg.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
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
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

svg.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
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
  if (event.key === "Home" || event.key === "0") home();
});

window.addEventListener("resize", render);
render();
