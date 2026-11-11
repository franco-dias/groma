/**
 * `Groma.edits()` and `Groma.onEdits()`: the text "Copy edits" writes, for a
 * script on the page that hands it to a coding agent with no copy and paste
 * (the bridge client of the `gromajs` command, scripts/bridge-client.js).
 *
 * The inspector keeps no copy of its own: it reads the edits when asked, and
 * only while someone listens.
 */
import { onEditsChanged } from "./changed";
import { handoffTextOrEmpty } from "./handoff-text";

type EditsListener = (text: string) => void;

const listeners = new Set<EditsListener>();
let lastText = "";

/** The text "Copy edits" copies for the page as it is now; "" when there are no edits or notes. */
export const edits = (): string => handoffTextOrEmpty();

function callSafely(listener: EditsListener, text: string): void {
  try {
    listener(text);
  } catch {
    // A listener's mistake is the page's, and must not stop the others.
  }
}

onEditsChanged(() => {
  if (!listeners.size) return;
  const text = edits();
  if (text === lastText) return;
  lastText = text;
  listeners.forEach((listener) => callSafely(listener, text));
});

/** Calls `listener` with the new text each time it changes. Returns the function that stops it. */
export function onEdits(listener: EditsListener): () => void {
  if (!listeners.size) lastText = edits();
  // A wrapper, so the same function can listen twice and stop each time on its own.
  const own: EditsListener = (text) => listener(text);
  listeners.add(own);
  return () => void listeners.delete(own);
}
