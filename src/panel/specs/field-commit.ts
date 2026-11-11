/** Making an edit of what was typed in an editable value of the Specs tab. */
import { edit, nudgeEdit, removeEdit } from "../../edits/changes";
import { isValidStyle } from "../../edits/style-overrides";
import type { EditableField, FieldSession } from "./field-types";

/** "24", or "12 16" for the sides of a box: every bare number gets its unit. */
const BARE_NUMBER = /(?<![\w.#-])(-?\d*\.?\d+)(?![\w.%])/g;

function valueFor({ prop, whole }: EditableField, typed: string): string {
  const inPixels = typed.replace(BARE_NUMBER, "$1px");
  const asTyped = whole ? whole(typed) : typed;
  const asPixels = whole ? whole(inPixels) : inPixels;
  return typed && !isValidStyle(prop, asTyped) && isValidStyle(prop, asPixels) ? asPixels : asTyped;
}

function targetOf({ context, prop }: EditableField): { selector: string; prop: string; element: Element } {
  return { selector: context.selector, prop, element: context.element };
}

function commitWith(
  session: FieldSession,
  { typed, makeEdit }: { typed: string; makeEdit: typeof edit },
): boolean {
  const value = valueFor(session.field, typed);
  const target = targetOf(session.field);
  return value ? makeEdit({ ...target, value }) : removeEdit(target);
}

/** Makes what was typed an edit; an empty value removes the edit. Returns false for a value the browser rejects. */
export const commitTyped = (session: FieldSession, typed: string): boolean =>
  commitWith(session, { typed, makeEdit: edit });

/** The same, as one small step of many (an arrow key): a run of them undoes at once. */
export const commitNudge = (session: FieldSession, typed: string): boolean =>
  commitWith(session, { typed, makeEdit: nudgeEdit });
