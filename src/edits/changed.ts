/**
 * Tells whoever listens that the user's edits changed (an edit, an undo or
 * redo, a discard, a note). It does not say what changed: `Groma.onEdits`
 * (agent-api.ts) reads the text again and passes it on only if it differs.
 *
 * Calls in one turn of the event loop make one notice, so a choice that sets
 * several properties is announced once, with all of them.
 */
const listeners = new Set<() => void>();
let isScheduled = false;

function notify(): void {
  isScheduled = false;
  listeners.forEach((listener) => listener());
}

/** Call after any change of the saved edits. Costs nothing when nobody listens. */
export function editsChanged(): void {
  if (isScheduled || !listeners.size) return;
  isScheduled = true;
  queueMicrotask(notify);
}

export function onEditsChanged(listener: () => void): void {
  listeners.add(listener);
}
