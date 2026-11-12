/**
 * Where a key was typed, for the inspector's shortcuts: a key typed in a
 * field (an input of the page or of the panel, or a value being edited) is
 * the field's own, and the inspector leaves it alone.
 */
import { isElement } from "./page";

/** The element the key was really typed in, inside the inspector's shadow root too. */
export const typedTarget = (event: Event): unknown => event.composedPath()[0];

/** An input, or a value being edited. */
export const isField = (target: unknown): boolean =>
  isElement(target) &&
  // Cast: only HTML elements say whether they are editable; the rest are not.
  ((target as HTMLElement).isContentEditable === true ||
    ["input", "textarea", "select"].includes(target.localName));
