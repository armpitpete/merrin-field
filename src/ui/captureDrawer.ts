import {
  EMOTIONAL_COLOURS,
  type EmotionalTag,
  type EntryVisibility,
  type FieldEntry,
  type StoredMedia,
} from "../field/entry";

export type CaptureDrawerOptions = {
  onCreate: (entry: FieldEntry) => Promise<void>;
};

function localDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function createLabel(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "capture-field";
  const name = document.createElement("span");
  name.className = "capture-field-name";
  name.textContent = text;
  label.append(name, control);
  return label;
}

function mediaFromFile(file: File): StoredMedia {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "application/octet-stream",
    blob: file,
  };
}

export function createCaptureDrawer(options: CaptureDrawerOptions): HTMLElement {
  const shell = document.createElement("div");
  shell.className = "capture-shell";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "capture-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open life capture drawer");
  toggle.textContent = "+";

  const drawer = document.createElement("aside");
  drawer.className = "capture-drawer";
  drawer.setAttribute("aria-label", "Add something to Merrin Field");

  const header = document.createElement("div");
  header.className = "capture-header";
  const title = document.createElement("strong");
  title.textContent = "add something";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "capture-close";
  close.setAttribute("aria-label", "Close capture drawer");
  close.textContent = "×";
  header.append(title, close);

  const form = document.createElement("form");
  form.className = "capture-form";

  const happenedAt = document.createElement("input");
  happenedAt.type = "datetime-local";
  happenedAt.value = localDateTimeValue(new Date());

  const text = document.createElement("textarea");
  text.rows = 6;
  text.placeholder = "What happened, what are you thinking, what should remain?";

  const media = document.createElement("input");
  media.type = "file";
  media.multiple = true;
  media.accept = "image/*,video/*,audio/*,.pdf";

  const mediaNote = document.createElement("div");
  mediaNote.className = "capture-media-note";
  mediaNote.textContent = "Images and video stay small in the field; sound can wake them on approach.";

  const recordRow = document.createElement("div");
  recordRow.className = "capture-record-row";
  const record = document.createElement("button");
  record.type = "button";
  record.className = "capture-secondary-button";
  record.textContent = "record sound now";
  const recordState = document.createElement("span");
  recordState.className = "capture-record-state";
  recordRow.append(record, recordState);

  const place = document.createElement("input");
  place.type = "text";
  place.placeholder = "York, kitchen, train to London…";

  const whyNow = document.createElement("textarea");
  whyNow.rows = 2;
  whyNow.placeholder = "Optional; composition metadata, not necessarily public.";

  const relationships = document.createElement("input");
  relationships.type = "text";
  relationships.placeholder = "IPM, Vaelinya, garden, a person…";

  const importance = document.createElement("input");
  importance.type = "range";
  importance.min = "0";
  importance.max = "100";
  importance.value = "60";
  const importanceWrap = document.createElement("div");
  importanceWrap.className = "capture-range";
  const peripheral = document.createElement("span");
  peripheral.textContent = "peripheral";
  const central = document.createElement("span");
  central.textContent = "central";
  importanceWrap.append(importance, peripheral, central);

  const visibility = document.createElement("select");
  for (const value of ["private", "public", "draft"] satisfies EntryVisibility[]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    visibility.append(option);
  }

  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const pinLabel = document.createElement("label");
  pinLabel.className = "capture-inline-check";
  pinLabel.append(pinned, document.createTextNode(" keep near the present centre"));

  const emotions = document.createElement("fieldset");
  emotions.className = "capture-emotions";
  const emotionLegend = document.createElement("legend");
  emotionLegend.textContent = "emotional colour tags";
  emotions.append(emotionLegend);
  const emotionInputs = new Map<EmotionalTag, HTMLInputElement>();
  for (const [emotion, colour] of Object.entries(EMOTIONAL_COLOURS) as Array<
    [EmotionalTag, string]
  >) {
    const label = document.createElement("label");
    label.className = "emotion-chip";
    label.style.setProperty("--emotion-colour", colour);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = emotion;
    emotionInputs.set(emotion, input);
    const dot = document.createElement("span");
    dot.className = "emotion-dot";
    const word = document.createElement("span");
    word.textContent = emotion;
    label.append(input, dot, word);
    emotions.append(label);
  }

  const save = document.createElement("button");
  save.type = "submit";
  save.className = "capture-save";
  save.textContent = "add to field";

  const persistenceNote = document.createElement("p");
  persistenceNote.className = "capture-persistence-note";
  persistenceNote.textContent =
    "M0.2 stores captures and uploads in this browser. Cross-device publishing is the next persistence gate.";

  form.append(
    createLabel("when", happenedAt),
    createLabel("text", text),
    createLabel("upload", media),
    mediaNote,
    recordRow,
    createLabel("place", place),
    createLabel("why does this matter now?", whyNow),
    createLabel("belongs with", relationships),
    createLabel("importance", importanceWrap),
    emotions,
    createLabel("visibility", visibility),
    pinLabel,
    save,
    persistenceNote,
  );

  drawer.append(header, form);
  shell.append(toggle, drawer);

  let recording: MediaRecorder | null = null;
  let recordingStream: MediaStream | null = null;
  let recordedChunks: Blob[] = [];
  const recordedMedia: StoredMedia[] = [];

  async function stopRecording(): Promise<void> {
    if (!recording || recording.state === "inactive") return;
    recording.stop();
  }

  record.addEventListener("click", () => {
    if (recording && recording.state === "recording") {
      void stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      recordState.textContent = "recording is not available in this browser";
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        recordingStream = stream;
        recordedChunks = [];
        recording = new MediaRecorder(stream);
        recording.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) recordedChunks.push(event.data);
        });
        recording.addEventListener("stop", () => {
          const type = recording?.mimeType || "audio/webm";
          const blob = new Blob(recordedChunks, { type });
          recordedMedia.push({
            id: crypto.randomUUID(),
            name: `field-recording-${new Date().toISOString()}.webm`,
            type,
            blob,
          });
          recordingStream?.getTracks().forEach((track) => track.stop());
          recordingStream = null;
          recording = null;
          record.textContent = "record another sound";
          recordState.textContent = "sound captured";
        });
        recording.start();
        record.textContent = "stop recording";
        recordState.textContent = "recording…";
      })
      .catch(() => {
        recordState.textContent = "microphone permission was not granted";
      });
  });

  function setOpen(open: boolean): void {
    shell.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) text.focus();
  }

  toggle.addEventListener("click", () => setOpen(!shell.classList.contains("is-open")));
  close.addEventListener("click", () => setOpen(false));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    if (!typing && event.key.toLowerCase() === "c") setOpen(true);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const happenedDate = happenedAt.value ? new Date(happenedAt.value) : new Date();
    const selectedFiles = Array.from(media.files ?? []).map(mediaFromFile);
    const selectedEmotions = Array.from(emotionInputs.entries())
      .filter(([, input]) => input.checked)
      .map(([emotion]) => emotion);

    const entry: FieldEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      happenedAt: Number.isFinite(happenedDate.getTime())
        ? happenedDate.toISOString()
        : new Date().toISOString(),
      text: text.value.trim(),
      whyNow: whyNow.value.trim(),
      place: place.value.trim(),
      importance: Number(importance.value),
      pinned: pinned.checked,
      relationships: relationships.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      visibility: visibility.value as EntryVisibility,
      emotions: selectedEmotions,
      media: [...selectedFiles, ...recordedMedia],
    };

    if (!entry.text && entry.media.length === 0) {
      text.focus();
      return;
    }

    save.disabled = true;
    save.textContent = "adding…";
    void options
      .onCreate(entry)
      .then(() => {
        text.value = "";
        whyNow.value = "";
        media.value = "";
        recordedMedia.length = 0;
        recordState.textContent = "";
        record.textContent = "record sound now";
        happenedAt.value = localDateTimeValue(new Date());
        save.textContent = "added";
        window.setTimeout(() => {
          save.textContent = "add to field";
          save.disabled = false;
          setOpen(false);
        }, 450);
      })
      .catch(() => {
        save.disabled = false;
        save.textContent = "try again";
      });
  });

  return shell;
}
