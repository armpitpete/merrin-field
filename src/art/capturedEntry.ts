import {
  EMOTIONAL_COLOURS,
  positionForEntry,
  primaryEmotionColour,
  type FieldEntry,
  type StoredMedia,
} from "../field/entry";

const SVG_NS = "http://www.w3.org/2000/svg";
const MEDIA_WORLD_WIDTH = 340;
const MEDIA_WORLD_HEIGHT = 255;

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

function firstMedia(entry: FieldEntry, prefix: string): StoredMedia | undefined {
  return entry.media.find((asset) => asset.type.startsWith(prefix));
}

function fadeAudio(audio: HTMLAudioElement, target: number, onSilent?: () => void): void {
  const start = audio.volume;
  const started = performance.now();
  const duration = 520;

  function frame(now: number): void {
    const progress = Math.min(1, (now - started) / duration);
    audio.volume = start + (target - start) * progress;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else if (target === 0) {
      onSilent?.();
    }
  }

  requestAnimationFrame(frame);
}

function readableDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function createCapturedEntry(entry: FieldEntry): SVGGElement {
  const position = positionForEntry(entry);
  const group = svgElement("g", {
    class: `captured-entry captured-entry-${entry.visibility}`,
    transform: `translate(${position.x} ${position.y}) rotate(${position.rotate})`,
    tabindex: "0",
    role: "group",
    "aria-label": entry.text || `Captured field entry from ${readableDate(entry.happenedAt)}`,
  });
  group.style.setProperty("--entry-emotion", primaryEmotionColour(entry));

  const text = svgElement("text", {
    x: "0",
    y: "0",
    class: "captured-entry-text",
  });
  text.textContent = entry.text || "untitled fragment";
  group.append(text);

  const meta = svgElement("text", {
    x: "4",
    y: "34",
    class: "captured-entry-meta",
  });
  const place = entry.place ? ` · ${entry.place}` : "";
  const visibility = entry.visibility === "public" ? "" : ` · ${entry.visibility}`;
  meta.textContent = `${readableDate(entry.happenedAt)}${place}${visibility}`;
  group.append(meta);

  entry.emotions.forEach((emotion, index) => {
    const dot = svgElement("circle", {
      cx: String(6 + index * 18),
      cy: "58",
      r: "5",
      class: "captured-emotion-dot",
    });
    dot.style.setProperty("--emotion-colour", EMOTIONAL_COLOURS[emotion]);
    group.append(dot);
  });

  const imageAsset = firstMedia(entry, "image/");
  const videoAsset = firstMedia(entry, "video/");
  const audioAsset = firstMedia(entry, "audio/");
  let video: HTMLVideoElement | null = null;

  const visualAsset = imageAsset ?? videoAsset;
  if (visualAsset) {
    const foreignObject = svgElement("foreignObject", {
      x: "24",
      y: "78",
      width: String(MEDIA_WORLD_WIDTH),
      height: String(MEDIA_WORLD_HEIGHT),
      class: "captured-visual-wrap",
    });
    const visual = document.createElement("div");
    visual.className = "captured-visual";

    if (imageAsset) {
      const image = document.createElement("img");
      image.src = URL.createObjectURL(imageAsset.blob);
      image.alt = imageAsset.name;
      visual.append(image);
    } else if (videoAsset) {
      video = document.createElement("video");
      video.src = URL.createObjectURL(videoAsset.blob);
      video.preload = "metadata";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      visual.append(video);
    }

    foreignObject.append(visual);
    group.append(foreignObject);
  }

  let audio: HTMLAudioElement | null = null;
  if (audioAsset) {
    audio = new Audio(URL.createObjectURL(audioAsset.blob));
    audio.preload = "metadata";
    audio.volume = 0;
  }

  let lingerTimer: number | null = null;

  function wake(): void {
    group.classList.add("is-awake");
    if (lingerTimer !== null) window.clearTimeout(lingerTimer);
    lingerTimer = window.setTimeout(() => group.classList.add("is-lingering"), 1800);

    if (video) {
      void video.play().catch(() => undefined);
    }
    if (audio) {
      if (audio.ended) audio.currentTime = 0;
      void audio
        .play()
        .then(() => fadeAudio(audio as HTMLAudioElement, 0.78))
        .catch(() => undefined);
    }
  }

  function sleep(): void {
    group.classList.remove("is-awake", "is-lingering");
    if (lingerTimer !== null) {
      window.clearTimeout(lingerTimer);
      lingerTimer = null;
    }
    if (video) video.pause();
    if (audio && !audio.paused) {
      fadeAudio(audio, 0, () => {
        audio?.pause();
        if (audio) audio.currentTime = 0;
      });
    }
  }

  group.addEventListener("pointerenter", wake);
  group.addEventListener("pointerleave", sleep);
  group.addEventListener("focus", wake);
  group.addEventListener("blur", sleep);
  group.addEventListener("pointerdown", wake);

  return group;
}
