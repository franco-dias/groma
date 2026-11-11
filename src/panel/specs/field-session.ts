/**
 * One editable value of the Specs tab, from the double-click that opens it to
 * the edit it makes: what it holds, saving what was typed, and the list of
 * tokens that fit the property while it is open.
 */
import { rerender } from "../../selection";
import { createTokenList, type TokenList } from "../token-list/token-list";
import { options } from "../../options";
import { fieldLength, rootFontSize } from "./display";
import { commitTyped } from "./field-commit";
import type { EditableField, FieldSession } from "./field-types";

export function createSession(node: HTMLElement, field: EditableField): FieldSession {
  const held = field.whole ? field.value : (field.context.saved[field.prop] ?? field.value);
  return { node, field, held, text: node.textContent, isEditing: false };
}

/** What the field shows when it opens: the value in the unit the tab shows. */
export const openedText = (session: FieldSession): string => fieldLength(session.held);

function selectContents(node: HTMLElement): void {
  try {
    getSelection()?.selectAllChildren(node);
  } catch {
    // The field is still focused; the user selects by hand.
  }
}

function openTokens(session: FieldSession): TokenList | undefined {
  const { context, prop } = session.field;
  return createTokenList({
    prop,
    computedStyle: context.computedStyle,
    field: session.node,
    host: context.body,
    opened: openedText(session),
    length: { rootFontSize: rootFontSize(), bareUnit: options.unit },
    pick: (name) => pickToken(session, name),
  });
}

/** Turns the value into a field that holds `held`. */
export function startEditing(session: FieldSession): void {
  if (session.isEditing) return;
  session.isEditing = true;
  const { node } = session;
  node.textContent = openedText(session);
  node.contentEditable = "plaintext-only";
  node.spellcheck = false;
  node.classList.add("is-editing");
  node.focus();
  selectContents(node);
  // A property with no kind of token (a grid's tracks) gets no list.
  session.tokens = openTokens(session);
}

export function stopEditing(session: FieldSession): void {
  session.isEditing = false;
  session.node.contentEditable = "false";
  session.node.classList.remove("is-editing");
  session.tokens?.close();
  session.tokens = undefined;
}

/** Writes the token as the value and closes the field. */
export function pickToken(session: FieldSession, name: string): void {
  stopEditing(session);
  commitTyped(session, `var(${name})`);
  rerender();
}

/** The field lost the focus: what was typed is the edit. */
export function leaveField(session: FieldSession): void {
  if (!session.isEditing) return;
  const typed = (session.node.textContent ?? "").trim();
  stopEditing(session);
  if (typed !== openedText(session)) commitTyped(session, typed);
  rerender();
}
