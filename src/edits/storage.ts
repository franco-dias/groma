/**
 * JSON objects in localStorage that never throw.
 *
 * When the browser refuses to store a value (storage blocked or full), the
 * value is kept in memory until the page goes away, so the user's edits are
 * still listed, copied and undone; they are only not there after a reload.
 */

/** What could not be stored, as JSON, by key. */
const unsaved = new Map<string, string>();

export function readStore<TStored extends object>(key: string): Partial<TStored> {
  try {
    return JSON.parse(unsaved.get(key) ?? localStorage.getItem(key) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function writeStore(key: string, value: object): void {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
    unsaved.delete(key);
  } catch {
    // Storage is blocked or full: the change still applies, it is just not saved.
    unsaved.set(key, json);
  }
}
