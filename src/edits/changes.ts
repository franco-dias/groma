/**
 * The user's edits to the page: style values, content and notes.
 *
 * Every edit goes through `edit()` (or `nudgeEdit()` for an arrow key, and
 * `removeEdit()` to take one off). Each applies the edit, saves it and
 * remembers it for undo. The value the page had before the first edit of a
 * property is saved too, so the Edits tab can show before → after and hand
 * both to whoever applies the change in the source. An edit that sets a
 * property back to that value is taken off instead of listed, as the ↩ does.
 *
 * A note is a plain-text instruction attached to an element. It changes
 * nothing on the page.
 */
import { beforeOf } from "./edit-records";
import { applyValue, currentValue, findEdited, isStyleProp } from "./edit-values";
import { recordChange } from "./history";
import { isValidStyle } from "./style-overrides";

/**
 * What an edit is of: a CSS property, `CONTENT` or `NOTE` of the element
 * `selector` leads to, or `element` when the caller already holds it.
 */
export type EditTarget = { selector: string; prop: string; element?: Element };

export type EditRequest = EditTarget & { value: string };

/**
 * Makes an edit. Returns false, and changes nothing, for a style value the
 * browser rejects.
 */
export const edit = (request: EditRequest): boolean => commitChange(request, 0);

/**
 * An edit that is one small step of many (an arrow key): a run of them on one
 * value undoes at once.
 */
export const nudgeEdit = (request: EditRequest): boolean => commitChange(request, Date.now());

/** Removes an edit and puts back what the page had. */
export const removeEdit = (target: EditTarget): boolean => commitChange({ ...target, value: undefined }, 0);

type Commit = EditTarget & { value: string | undefined };

function commitChange(request: Commit, nudgedAt: number): boolean {
  const { selector, prop, value } = request;
  if (value !== undefined && isStyleProp(prop) && !isValidStyle(prop, value)) return false;
  // The page may have removed the element a tab still shows, or drawn it
  // again: the edit goes to the element that is there now, and to none if none is.
  const wasReplaced = request.element !== undefined && !request.element.isConnected;
  const element = request.element?.isConnected ? request.element : findEdited(selector);
  if (wasReplaced && !element && value !== undefined) return false;
  const from = currentValue(selector, prop);
  if (from === value) return true;
  // Back to what the page had: nothing was changed, so nothing is listed.
  const to = from !== undefined && beforeOf(request) === value ? undefined : value;
  applyValue({ selector, prop, value: to, element });
  recordChange({ selector, prop, from, to }, nudgedAt);
  return true;
}
