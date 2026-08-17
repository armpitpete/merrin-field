import {
  EMOTIONAL_COLOURS,
  type EmotionalTag,
  type EntryVisibility,
  type FieldEntry,
  type StoredMedia,
} from "../field/entry";

export type CaptureDrawerOptions = {
  onCreate: (entry: FieldEntry) => Promise<void>;
  onUpdate: (entry: FieldEntry, previous: FieldEntry) => Promise<void>;
  onDelete: (entry: FieldEntry) => Promise<void>;
};

export type CaptureDrawerController = {
  element: HTMLElement;
  openForCreate: () => void;
  openForEdit: (entry: FieldEntry) => void;
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function createCaptureDrawer(
  options: CaptureDrawerOptions,
): CaptureDrawerController {
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
  drawer.setAttribute("aria-label", "Add or edit something in Merrin Field");

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
  text.placeholder =
    "What happened, what are you thinking, what should remain?";

  const media = document.createElement("input");
  media.type = "file";
  media.multiple = true;
  media.accept = "image/*,video/*,audio/*,.pdf";

  const existingMedia = document.createElement("div");
  existingMedia.className = "capture-existing-media";
  existingMedia.hidden = true;

  const mediaNote = document.createElement("div");
  mediaNote.className = "capture-media-note";
  mediaNote.textContent =
    "Images and video stay small in the field; sound can wake them on approach. Public uploads are limited to 4 MB per record at this gate.";

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
  whyNow.placeholder =
    "Optional; composition metadata, not necessarily public.";

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
  for (const value of [
    "private",
    "public",
    "draft",
  ] satisfies EntryVisibility[]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    visibility.append(option);
  }

  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const pinLabel = document.createElement("label");
  pinLabel.className = "capture-inline-check";
  pinLabel.append(
    pinned,
    document.createTextNode(" keep near the present centre"),
  );

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
  const saveNotice = document.createElement("span");
  saveNotice.className = "capture-delete-notice";
  saveNotice.setAttribute("aria-live", "polite");

  const deleteArea = document.createElement("div");
  deleteArea.className = "capture-delete-area";
  deleteArea.hidden = true;
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "capture-delete";
  deleteButton.textContent = "delete record";
  const deleteNotice = document.createElement("span");
  deleteNotice.className = "capture-delete-notice";
  deleteArea.append(deleteButton, deleteNotice);

  const persistenceNote = document.createElement("p");
  persistenceNote.className = "capture-persistence-note";
  persistenceNote.textContent =
    "Private and draft records stay in this browser. Public records are sent to the shared field only after server storage accepts them.";

  form.append(
    createLabel("when", happenedAt),
    createLabel("text", text),
    createLabel("upload more", media),
    existingMedia,
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
    saveNotice,
    deleteArea,
    persistenceNote,
  );

  drawer.append(header, form);
  shell.append(toggle, drawer);

  let editingEntry: FieldEntry | null = null;
  let deleteArmed = false;
  let recording: MediaRecorder | null = null;
  let recordingStream: MediaStream | null = null;
  let recordedChunks: Blob[] = [];
  const recordedMedia: StoredMedia[] = [];
  const existingMediaKeep = new Map<string, HTMLInputElement>();

  function setOpen(open: boolean): void {
    shell.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) text.focus();
  }

  function resetDeleteArm(): void {
    deleteArmed = false;
    deleteButton.textContent = "delete record";
    deleteNotice.textContent = "";
  }

  function resetRecordingState(): void {
    recordedMedia.length = 0;
    recordState.textContent = "";
    record.textContent = "record sound now";
  }

  function renderExistingMedia(entry: FieldEntry | null): void {
    existingMedia.replaceChildren();
    existingMediaKeep.clear();
    if (!entry || entry.media.length === 0) {
      existingMedia.hidden = true;
      return;
    }

    existingMedia.hidden = false;
    const heading = document.createElement("span");
    heading.className = "capture-field-name";
    heading.textContent = "existing media";
    existingMedia.append(heading);

    for (const asset of entry.media) {
      const label = document.createElement("label");
      label.className = "capture-existing-media-item";
      const keep = document.createElement("input");
      keep.type = "checkbox";
      keep.checked = true;
      existingMediaKeep.set(asset.id, keep);
      label.append(keep, document.createTextNode(` keep ${asset.name}`));
      existingMedia.append(label);
    }
  }

  function clearForm(): void {
    editingEntry = null;
    happenedAt.value = localDateTimeValue(new Date());
    text.value = "";
    media.value = "";
    place.value = "";
    whyNow.value = "";
    relationships.value = "";
    importance.value = "60";
    visibility.value = "private";
    pinned.checked = false;
    for (const input of emotionInputs.values()) input.checked = false;
    renderExistingMedia(null);
    resetRecordingState();
    resetDeleteArm();
    saveNotice.textContent = "";
    title.textContent = "add something";
    save.textContent = "add to field";
    save.disabled = false;
    deleteArea.hidden = true;
  }

  function loadEntry(entry: FieldEntry): void {
    editingEntry = entry;
    happenedAt.value = localDateTimeValue(new Date(entry.happenedAt));
    text.value = entry.text;
    media.value = "";
    place.value = entry.place;
    whyNow.value = entry.whyNow;
    relationships.value = entry.relationships.join(", ");
    importance.value = String(entry.importance);
    visibility.value = entry.visibility;
    pinned.checked = entry.pinned;
    for (const [emotion, input] of emotionInputs) {
      input.checked = entry.emotions.includes(emotion);
    }
    renderExistingMedia(entry);
    resetRecordingState();
    resetDeleteArm();
    saveNotice.textContent = "";
    title.textContent = "edit record";
    save.textContent = "save changes";
    save.disabled = false;
    deleteArea.hidden = false;
  }

  function openForCreate(): void {
    clearForm();
    setOpen(true);
  }

  function openForEdit(entry: FieldEntry): void {
    loadEntry(entry);
    setOpen(true);
  }

  async function stopRecording(): Promise<void> {
    if (!recording || recording.state === "inactive") return;
    recording.stop();
  }

  record.addEventListener("click", () => {
    if (recording && recording.state === "recording") {
      void stopRecording();
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
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

  toggle.addEventListener("click", () => {
    if (shell.classList.contains("is-open")) {
      setOpen(false);
    } else {
      openForCreate();
    }
  });
  close.addEventListener("click", () => setOpen(false));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
    const target = event.target;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    if (!typing && event.key.toLowerCase() === "c") openForCreate();
  });

  deleteButton.addEventListener("click", () => {
    if (!editingEntry) return;
    if (!deleteArmed) {
      deleteArmed = true;
      deleteButton.textContent = "delete permanently";
      const preview =
        editingEntry.text.trim().slice(0, 48) || "untitled record";
      const destination =
        editingEntry.visibility === "public"
          ? " from this browser and the shared field"
          : " from this browser";
      deleteNotice.textContent = `Will remove “${preview}${editingEntry.text.length > 48 ? "…" : ""}”${destination}.`;
      return;
    }

    deleteButton.disabled = true;
    deleteButton.textContent = "deleting…";
    const entry = editingEntry;
    void options
      .onDelete(entry)
      .then(() => {
        setOpen(false);
        clearForm();
        deleteButton.disabled = false;
      })
      .catch((error: unknown) => {
        deleteButton.disabled = false;
        deleteButton.textContent = "try delete again";
        deleteNotice.textContent = errorMessage(
          error,
          "Delete failed; the record is still present.",
        );
        deleteArmed = true;
      });
  });

  form.addEventListener("input", () => {
    resetDeleteArm();
    saveNotice.textContent = "";
  });
  form.addEventListener("change", () => {
    resetDeleteArm();
    saveNotice.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const happenedDate = happenedAt.value
      ? new Date(happenedAt.value)
      : new Date();
    const selectedFiles = Array.from(media.files ?? []).map(mediaFromFile);
    const selectedEmotions = Array.from(emotionInputs.entries())
      .filter(([, input]) => input.checked)
      .map(([emotion]) => emotion);
    const keptExistingMedia = editingEntry
      ? editingEntry.media.filter(
          (asset) => existingMediaKeep.get(asset.id)?.checked !== false,
        )
      : [];
    const now = new Date().toISOString();

    const entry: FieldEntry = {
      id: editingEntry?.id ?? crypto.randomUUID(),
      createdAt: editingEntry?.createdAt ?? now,
      updatedAt: editingEntry ? now : undefined,
      happenedAt: Number.isFinite(happenedDate.getTime())
        ? happenedDate.toISOString()
        : now,
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
      media: [...keptExistingMedia, ...selectedFiles, ...recordedMedia],
    };

    if (!entry.text && entry.media.length === 0) {
      text.focus();
      return;
    }

    const previousEntry = editingEntry;
    const updating = previousEntry !== null;
    saveNotice.textContent = "";
    save.disabled = true;
    save.textContent = updating ? "saving…" : "adding…";
    const action = previousEntry
      ? options.onUpdate(entry, previousEntry)
      : options.onCreate(entry);
    void action
      .then(() => {
        save.textContent = updating ? "saved" : "added";
        window.setTimeout(() => {
          setOpen(false);
          clearForm();
        }, 350);
      })
      .catch((error: unknown) => {
        save.disabled = false;
        save.textContent = "try again";
        saveNotice.textContent = errorMessage(error, "Save failed.");
      });
  });

  return { element: shell, openForCreate, openForEdit };
}
