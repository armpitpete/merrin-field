import type { FieldEntry } from "./entry";

const DATABASE_NAME = "merrin-field";
const DATABASE_VERSION = 1;
const ENTRY_STORE = "entries";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTRY_STORE)) {
        database.createObjectStore(ENTRY_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open field storage"));
  });
}

export async function saveEntry(entry: FieldEntry): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ENTRY_STORE, "readwrite");
    transaction.objectStore(ENTRY_STORE).put(entry);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save entry"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving entry was aborted"));
  });
  database.close();
}

export async function listEntries(): Promise<FieldEntry[]> {
  const database = await openDatabase();
  const entries = await new Promise<FieldEntry[]>((resolve, reject) => {
    const transaction = database.transaction(ENTRY_STORE, "readonly");
    const request = transaction.objectStore(ENTRY_STORE).getAll();
    request.onsuccess = () => resolve(request.result as FieldEntry[]);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read entries"));
  });
  database.close();
  return entries.sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
}
