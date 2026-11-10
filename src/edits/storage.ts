/** JSON objects in localStorage that never throw. */

export function readStore<T extends object>(key: string): Partial<T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function writeStore(key: string, value: object): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is blocked or full: the change still applies, it is just not saved.
  }
}
