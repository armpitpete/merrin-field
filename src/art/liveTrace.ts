const SVG_NS = "http://www.w3.org/2000/svg";

const LIVE_TRACE =
  "data:image/webp;base64,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";

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

export function createLiveTrace(): SVGGElement {
  const group = svgElement("g", {
    class: "live-trace",
    transform: "translate(-980 610) rotate(-5)",
    "aria-label": "A faded trace of an earlier state of this field",
  });

  const defs = svgElement("defs");
  const clip = svgElement("clipPath", { id: "live-trace-clip" });
  clip.append(
    svgElement("path", {
      d: "M 40 80 C 190 12 690 18 850 98 C 940 142 912 370 780 430 C 590 520 170 500 58 392 C -15 322 -40 142 40 80 Z",
    }),
  );
  defs.append(clip);
  group.append(defs);

  group.append(
    svgElement("image", {
      href: LIVE_TRACE,
      x: "0",
      y: "0",
      width: "900",
      height: "442",
      preserveAspectRatio: "xMidYMid slice",
      "clip-path": "url(#live-trace-clip)",
      class: "live-trace-image",
    }),
  );

  const caption = svgElement("text", {
    x: "78",
    y: "470",
    class: "live-trace-caption",
  });
  caption.textContent = "17 August 2026 · the field before it moved";
  group.append(caption);

  return group;
}
