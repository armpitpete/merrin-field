export type Camera = {
  x: number;
  y: number;
  scale: number;
};

export type Viewport = {
  width: number;
  height: number;
};

export const MIN_SCALE = 0.08;
export const MAX_SCALE = 24;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToWorld(
  camera: Camera,
  viewport: Viewport,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: camera.x + (screenX - viewport.width / 2) / camera.scale,
    y: camera.y + (screenY - viewport.height / 2) / camera.scale,
  };
}

export function panByScreenDelta(
  camera: Camera,
  deltaX: number,
  deltaY: number,
): Camera {
  return {
    ...camera,
    x: camera.x - deltaX / camera.scale,
    y: camera.y - deltaY / camera.scale,
  };
}

export function zoomAtScreenPoint(
  camera: Camera,
  viewport: Viewport,
  screenX: number,
  screenY: number,
  factor: number,
): Camera {
  const anchor = screenToWorld(camera, viewport, screenX, screenY);
  const scale = clampScale(camera.scale * factor);

  return {
    x: anchor.x - (screenX - viewport.width / 2) / scale,
    y: anchor.y - (screenY - viewport.height / 2) / scale,
    scale,
  };
}

export function cameraTransform(camera: Camera, viewport: Viewport): string {
  const screenX = viewport.width / 2 - camera.x * camera.scale;
  const screenY = viewport.height / 2 - camera.y * camera.scale;
  return `translate(${screenX} ${screenY}) scale(${camera.scale})`;
}
