/** The state of a drag on a value of the Specs tab, and the parts of following the pointer. */
import { beginScrub } from "../../edits/history";
import { pageDocument } from "../../page";
import { type StepKind, stepFor } from "../../specs/steps";

/** A value as the CSS holds it, and as the text the tab shows, which can differ: a width of 200px shows as the whole box, 232. */
export type ValuePair = [held: string, shown: string];

/**
 * `base` is the value where the pointer's distance is counted from (the
 * press, or the last change of step); `now` the one on the page.
 */
export type Drag = {
  pointer: number;
  startX: number;
  anchorX: number;
  step: number;
  kind: StepKind;
  isActive: boolean;
  base: ValuePair;
  now: ValuePair;
  /** The value and text at the press, which Escape puts back. */
  start: ValuePair;
  /** Stops listening for Escape; set while the drag is active. */
  stopWatching?: () => void;
};

// From the press, so the moves reach the value wherever the pointer goes: a value is a few
// pixels wide. (A press that stays put is still a click: the capture does not change that.)
export function captureTo(node: HTMLElement, pointerId: number): void {
  try {
    node.setPointerCapture(pointerId);
  } catch {
    // A pointer the browser does not know: the drag goes on while it stays over the value.
  }
}

/**
 * Calls `onEscape` for an Esc pressed while the drag lasts, and keeps that Esc
 * from the launcher and the page. The focus can be in the panel or in the
 * canvas frame, so both documents listen. Returns the way to stop.
 */
function listenForEscape(onEscape: () => void): () => void {
  const documents = new Set([document, pageDocument()]);
  const listener = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.stopImmediatePropagation();
    onEscape();
  };
  documents.forEach((target) => target.addEventListener("keydown", listener, true));
  return () => documents.forEach((target) => target.removeEventListener("keydown", listener, true));
}

export function startScrubbing({ node, drag, onEscape }: ScrubStart): void {
  drag.isActive = true;
  beginScrub();
  node.classList.add("is-scrubbing");
  getSelection()?.removeAllRanges();
  drag.stopWatching = listenForEscape(onEscape);
}

export type ScrubStart = { node: HTMLElement; drag: Drag; onEscape: () => void };

/** A modifier pressed mid-drag changes the step from here on, without a jump. */
export function followStep(drag: Drag, event: PointerEvent): number {
  const step = stepFor(event, drag.kind);
  if (step === drag.step) return step;
  drag.base = drag.now;
  drag.anchorX = event.clientX;
  drag.step = step;
  return step;
}
