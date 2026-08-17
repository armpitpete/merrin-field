export type ZoomBand = {
  min?: number;
  max?: number;
};

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function zoomBandOpacity(
  scale: number,
  band: ZoomBand,
  fadeFraction = 0.18,
): number {
  let opacity = 1;

  if (band.min !== undefined) {
    const fade = Math.max(0.01, band.min * fadeFraction);
    opacity *= smoothstep(band.min - fade, band.min + fade, scale);
  }

  if (band.max !== undefined) {
    const fade = Math.max(0.01, band.max * fadeFraction);
    opacity *= 1 - smoothstep(band.max - fade, band.max + fade, scale);
  }

  return Math.min(1, Math.max(0, opacity));
}

export function applyZoomVisibility(root: SVGElement, scale: number): void {
  const elements = root.querySelectorAll<SVGGraphicsElement>(
    "[data-zoom-min], [data-zoom-max]",
  );

  for (const element of elements) {
    const minValue = element.dataset.zoomMin;
    const maxValue = element.dataset.zoomMax;
    const min = minValue ? Number(minValue) : undefined;
    const max = maxValue ? Number(maxValue) : undefined;

    const opacity = zoomBandOpacity(scale, {
      ...(Number.isFinite(min) ? { min } : {}),
      ...(Number.isFinite(max) ? { max } : {}),
    });

    element.style.opacity = String(opacity);
    element.style.pointerEvents = opacity < 0.02 ? "none" : "auto";
  }
}
