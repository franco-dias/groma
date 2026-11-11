/**
 * One editable value of the Specs tab, from the double-click that opens it to
 * the edit it makes: what it holds, and saving what was typed.
 */
import { rerender } from "../../selection";
import { commitTyped } from "./field-commit";
import type { EditableField, FieldSession } from "./field-types";

export function createSession(node: HTMLElement, field: EditableField): FieldSession {
  const held = field.whole ? field.value : (field.context.saved[field.prop] ?? field.value);
  return { node, field, held, text: node.textContent, isEditing: false };
}

function selectContents(node: HTMLElement): void {
  try {
    getSelection()?.selectAllChildren(node);
  } catch {
    // The field is still focused; the user selects by hand.
  }
}

/** Turns the value into a field that holds `held`. */
export function startEditing(session: FieldSession): void {
  if (session.isEditing) return;
  session.isEditing = true;
  const { node } = session;
  node.textContent = session.held;
  node.contentEditable = "plaintext-only";
  node.spellcheck = false;
  node.classList.add("is-editing");
  node.focus();
  selectContents(node);
}

export function stopEditing(session: FieldSession): void {
  session.isEditing = false;
  session.node.contentEditable = "false";
  session.node.classList.remove("is-editing");
}

/** The field lost the focus: what was typed is the edit. */
export function leaveField(session: FieldSession): void {
  if (!session.isEditing) return;
  const typed = (session.node.textContent ?? "").trim();
  stopEditing(session);
  if (typed !== session.held) commitTyped(session, typed);
  rerender();
}
