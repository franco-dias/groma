/**
 * Esc unpins the element and closes the panel, as the last of what Esc
 * undoes. Text being typed on the page, a drag in the panel, a comparison,
 * the inspect lock and an open menu each take an Esc first, so the pin goes
 * only with an Esc that nothing else used. An Esc typed in a field of the
 * page, or sent while a field of the panel has the focus, is the field's,
 * and an Esc the page cancelled (its own dialog closing) keeps the pin.
 */
import { isField, typedTarget } from "./key-target";
import { options } from "./options";
import { isInspectLocked } from "./overlay/inspect-lock";
import { isTextEditing } from "./overlay/text-edit";
import { onPage, onPageCapture } from "./page";
import { findOwn, findOwnFocus } from "./root";
import { findPinnedElement, unpin } from "./selection";

/** The » menu, a menu under a Specs row, or the layers under the pointer. */
const isMenuOpen = (): boolean => findOwn(".more-menu:not([hidden]), .row-menu, .menu") !== undefined;

/** Read before the other Esc handlers run, since they change what is on. */
let isLastStep = false;

function hasNothingElseOn(event: KeyboardEvent): boolean {
  const isOff = !isInspectLocked() && !isTextEditing() && options.compareWith === undefined;
  // A value open as a field in the panel keeps its Esc, wherever the key was sent from.
  const isInField = isField(typedTarget(event)) || isField(findOwnFocus());
  return isOff && !isInField && !isMenuOpen();
}

function lookFirst(event: KeyboardEvent): void {
  isLastStep = event.key === "Escape" && findPinnedElement() !== undefined && hasNothingElseOn(event);
}

/** A handler that stops the Esc (text editing, a drag, a Specs menu) keeps this from running at all. */
function unpinLast(event: KeyboardEvent): void {
  if (!isLastStep || event.defaultPrevented) return;
  isLastStep = false;
  unpin();
}

export function startEscapeUnpin(): void {
  onPageCapture("keydown", lookFirst);
  onPage("keydown", unpinLast);
}
