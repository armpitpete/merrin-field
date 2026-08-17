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

function addPath(defs: SVGDefsElement, id: string, d: string): SVGPathElement {
  const path = svgElement("path", { id, d });
  defs.append(path);
  return path;
}

function addTextPath(
  group: SVGGElement,
  pathId: string,
  text: string,
  className: string,
  startOffset = "0%",
): SVGTextElement {
  const textElement = svgElement("text", { class: className });
  const textPath = svgElement("textPath", {
    href: `#${pathId}`,
    startOffset,
  });
  textPath.textContent = text;
  textElement.append(textPath);
  group.append(textElement);
  return textElement;
}

export function createTypographicPortrait(): SVGGElement {
  const portrait = svgElement("g", {
    class: "typographic-portrait",
    transform: "translate(1840 -120)",
    "aria-label": "A face drawn from words",
  });

  const defs = svgElement("defs");
  addPath(
    defs,
    "portrait-head",
    "M -50 -500 C -330 -520 -500 -330 -470 -70 C -450 110 -350 245 -235 325 C -150 385 -118 475 -105 570 C 20 520 122 435 160 315 C 200 200 238 125 330 52 C 388 5 385 -72 330 -102 C 286 -125 268 -160 285 -208 C 325 -320 210 -468 -50 -500 Z",
  );
  addPath(defs, "portrait-brow", "M -255 -150 C -170 -210 -45 -205 48 -153");
  addPath(
    defs,
    "portrait-eye",
    "M -205 -92 C -145 -132 -68 -130 -12 -88 C -72 -48 -148 -48 -205 -92 Z",
  );
  addPath(
    defs,
    "portrait-nose",
    "M 45 -140 C 35 -38 18 48 -12 102 C 24 124 63 128 96 108",
  );
  addPath(
    defs,
    "portrait-mouth",
    "M -72 190 C 5 160 88 168 146 204 C 80 239 8 244 -72 190",
  );
  addPath(
    defs,
    "portrait-neck",
    "M -118 420 C -95 530 -70 610 -15 688 C 90 640 145 545 160 430",
  );
  portrait.append(defs);

  const far = svgElement("g", {
    class: "portrait-far",
    "data-zoom-max": "1.65",
  });
  addTextPath(
    far,
    "portrait-head",
    "I keep making systems because the world rarely arrives as one · words become image · image becomes memory · a life changes shape · ",
    "portrait-outline",
    "1%",
  );
  addTextPath(
    far,
    "portrait-brow",
    "attention attention attention attention",
    "portrait-feature portrait-feature-strong",
  );
  addTextPath(
    far,
    "portrait-eye",
    "look · notice · look · notice · look · notice · ",
    "portrait-feature",
  );
  addTextPath(
    far,
    "portrait-nose",
    "follow the thought until it changes",
    "portrait-feature portrait-feature-small",
  );
  addTextPath(
    far,
    "portrait-mouth",
    "say it plainly · say it exactly ·",
    "portrait-feature portrait-feature-strong",
  );
  addTextPath(
    far,
    "portrait-neck",
    "York · sound · language · evidence · memory ·",
    "portrait-feature portrait-feature-small",
  );

  const hairLines = [
    [
      -330,
      -365,
      -9,
      "unfinished music unfinished language unfinished questions",
    ],
    [-360, -310, -7, "making making making making making making"],
    [-375, -252, -5, "systems stories sound type memory place"],
    [-386, -194, -3, "what happens next what happens next what happens next"],
  ] as const;

  for (const [x, y, rotate, words] of hairLines) {
    const line = svgElement("text", {
      x: String(x),
      y: String(y),
      class: "portrait-hair",
      transform: `rotate(${rotate} ${x} ${y})`,
    });
    line.textContent = words;
    far.append(line);
  }

  portrait.append(far);

  const near = svgElement("g", {
    class: "portrait-near",
    "data-zoom-min": "0.85",
  });

  const nearFragments = [
    [-275, 30, -6, "A change moves the page."],
    [-250, 78, -3, "There is no correct arrangement."],
    [-215, 126, 1, "Words can form imagery."],
    [-150, 300, 7, "The software enables composition."],
  ] as const;

  for (const [x, y, rotate, words] of nearFragments) {
    const line = svgElement("text", {
      x: String(x),
      y: String(y),
      class: "portrait-near-fragment",
      transform: `rotate(${rotate} ${x} ${y})`,
    });
    line.textContent = words;
    near.append(line);
  }

  portrait.append(near);
  return portrait;
}
