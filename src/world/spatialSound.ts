import type { Camera } from "./camera";

export type SpatialPoint = {
  x: number;
  y: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function presenceForSource(
  camera: Camera,
  source: SpatialPoint,
): number {
  const distance = Math.hypot(source.x - camera.x, source.y - camera.y);
  const distancePresence = clamp01(1 - distance / 2600);
  const zoomPresence = clamp01((camera.scale - 0.14) / 1.1);
  return distancePresence * (0.28 + zoomPresence * 0.72);
}

export function panForSource(camera: Camera, source: SpatialPoint): number {
  return Math.max(-1, Math.min(1, (source.x - camera.x) / 1500));
}

export type SpatialSound = {
  unlock: () => Promise<void>;
  update: (camera: Camera) => void;
};

export function createSpatialSound(source: SpatialPoint): SpatialSound {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let panner: StereoPannerNode | null = null;

  function initialise(): void {
    if (context) return;

    context = new AudioContext();

    const low = context.createOscillator();
    low.type = "sine";
    low.frequency.value = 58;

    const high = context.createOscillator();
    high.type = "sine";
    high.frequency.value = 87;

    const lowGain = context.createGain();
    lowGain.gain.value = 0.7;
    const highGain = context.createGain();
    highGain.gain.value = 0.18;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.4;

    master = context.createGain();
    master.gain.value = 0;

    panner = context.createStereoPanner();

    low.connect(lowGain).connect(filter);
    high.connect(highGain).connect(filter);
    filter.connect(master).connect(panner).connect(context.destination);

    low.start();
    high.start();
  }

  async function unlock(): Promise<void> {
    initialise();
    if (context?.state === "suspended") await context.resume();
  }

  function update(camera: Camera): void {
    if (!context || !master || !panner) return;

    const now = context.currentTime;
    const presence = presenceForSource(camera, source);
    const pan = panForSource(camera, source);

    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(presence * 0.026, now + 0.12);

    panner.pan.cancelScheduledValues(now);
    panner.pan.linearRampToValueAtTime(pan, now + 0.12);
  }

  return { unlock, update };
}
