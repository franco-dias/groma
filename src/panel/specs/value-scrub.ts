/**
 * Dragging a value sideways to change it, without opening it: 1 per pixel
 * (Shift: 10, Alt: 0.1), applied live, and the whole drag is one step to
 * undo. A value that is one number can be dragged; a press that does not move
 * 3 pixels is still a click.
 */
import { endScrub } from "../../edits/history";
import { rerender } from "../../selection";
import { isOneNumber, scrubValue, stepFor, stepKindOf } from "../../specs/steps";
import { commitTyped, restoreSaved } from "./field-commit";
import { openedText } from "./field-session";
import type { FieldSession } from "./field-types";
import { captureTo, type Drag, followStep, startScrubbing, type ValuePair } from "./scrub-drag";

/** A press that moves less than this many pixels is a click, not a drag. */
const SCRUB_AFTER_PX = 3;

type Scrub = { session: FieldSession; drag?: Drag; hasJustDragged: boolean };

function createDrag(session: FieldSession, event: PointerEvent): Drag {
  const opened = openedText(session);
  const here: ValuePair = [opened, session.node.textContent ?? ""];
  const kind = stepKindOf(session.field.prop, opened);
  const { pointerId, clientX } = event;
  const step = stepFor(event, kind);
  return {
    pointer: pointerId,
    startX: clientX,
    anchorX: clientX,
    step,
    kind,
    isActive: false,
    base: here,
    now: here,
    start: here,
  };
}

function press(scrub: Scrub, event: PointerEvent): void {
  scrub.hasJustDragged = false;
  const { session } = scrub;
  if (session.isEditing || event.button !== 0 || !event.isPrimary) return;
  scrub.drag = createDrag(session, event);
  captureTo(session.node, event.pointerId);
}

function scrubTo({ session, drag }: { session: FieldSession; drag: Drag }, event: PointerEvent): void {
  const step = followStep(drag, event);
  const distance = Math.round(event.clientX - drag.anchorX);
  const next = scrubValue(drag.base[0], { distance, step, kind: drag.kind });
  const nextShown = scrubValue(drag.base[1], { distance, step, kind: drag.kind });
  if (next === undefined || nextShown === undefined) return;
  // Back at the start: the edit that was there, or none.
  const applied = next === openedText(session) ? restoreSaved(session) : commitTyped(session, next);
  // A value the browser rejects (a negative width) is not applied; the last good one stays.
  if (!applied) return;
  drag.now = [next, nextShown];
  session.node.textContent = nextShown;
  const { context, prop } = session.field;
  session.node.classList.toggle("is-edited", next !== openedText(session) || prop in context.saved);
}

function move(scrub: Scrub, event: PointerEvent): void {
  const { drag, session } = scrub;
  if (!drag || event.pointerId !== drag.pointer) return;
  // Below 3 pixels it is still a click, or the first half of a double-click.
  const hasMoved = Math.abs(event.clientX - drag.startX) >= SCRUB_AFTER_PX;
  if (!drag.isActive && !hasMoved) return;
  if (!drag.isActive) startScrubbing({ node: session.node, drag, onEscape: () => cancel(scrub) });
  scrubTo({ session, drag }, event);
}

function release(scrub: Scrub): void {
  const ended = scrub.drag;
  scrub.drag = undefined;
  if (!ended?.isActive) return;
  ended.stopWatching?.();
  endScrub();
  scrub.session.node.classList.remove("is-scrubbing");
  scrub.hasJustDragged = true;
  // The click that ends the drag must not copy; the tab shows the rest after it.
  setTimeout(rerender, 0);
}

/** Esc: the value goes back to the press, with no edit and no step to undo. */
function cancel(scrub: Scrub): void {
  const { drag, session } = scrub;
  if (!drag?.isActive) return;
  // Before the drag ends: the steps it made are still one, and going back removes it.
  restoreSaved(session);
  session.node.textContent = drag.start[1];
  release(scrub);
}

/** Makes a value that is one number draggable. Other values have nothing to drag. */
export function mountScrub(session: FieldSession): void {
  if (!isOneNumber(session.held)) return;
  const { node } = session;
  const scrub: Scrub = { session, hasJustDragged: false };
  node.title += " · drag to change";
  node.addEventListener("pointerdown", (event) => press(scrub, event));
  node.addEventListener("pointermove", (event) => move(scrub, event));
  node.addEventListener("pointerup", () => release(scrub));
  node.addEventListener("pointercancel", () => release(scrub));
  node.addEventListener("selectstart", (event) => preventSelectionWhileDragging(scrub, event));
  node.addEventListener("click", (event) => keepDragFromCopying(scrub, event), true);
}

function preventSelectionWhileDragging(scrub: Scrub, event: Event): void {
  if (scrub.drag?.isActive) event.preventDefault();
}

/** The click that ends a drag must not copy. */
function keepDragFromCopying(scrub: Scrub, event: Event): void {
  if (scrub.hasJustDragged) event.stopImmediatePropagation();
  scrub.hasJustDragged = false;
}
