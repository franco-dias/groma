/**
 * A row of the All CSS tab whose value can be typed over.
 *
 *   Enter or blur   save        Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 */
import { h } from "../../dom";
import { edit, type EditRequest, nudgeEdit, removeEdit } from "../../edits/changes";
import { rerender } from "../../selection";
import { nudgeValue, stepFor, stepKindOf } from "../../specs/steps";
import { type CssRow, createRowShell } from "./css-rows";

/** The element a row edits, and where its edits are saved. */
export type RowTarget = { element: Element; selector: string };

type RowState = { shown: string; wasNudged: boolean };

type RowEditor = { row: CssRow; target: RowTarget; valueElement: HTMLElement; state: RowState };

/** The row the user was moving to when an edit caused a re-render. */
let focusAfterRender = "";

/** The row to put focus on after the tab draws again, if the user was moving to one. */
export function takeRowToFocus(): string {
  const row = focusAfterRender;
  focusAfterRender = "";
  return row;
}

function editRequest({ row, target }: RowEditor, value: string): EditRequest {
  return { selector: target.selector, prop: row.name, element: target.element, value };
}

/** A value the browser rejects is not kept: the row goes back to what it showed. */
function save(
  editor: RowEditor,
  change: { value: string; makeEdit: (request: EditRequest) => boolean },
): void {
  if (change.makeEdit(editRequest(editor, change.value))) editor.state.shown = change.value;
}

/** Saves and applies a value. An empty value removes the edit. */
function commit(editor: RowEditor, value: string): void {
  if (value) save(editor, { value, makeEdit: edit });
  else removeEdit(editRequest(editor, ""));
}

function nudgeNumber(editor: RowEditor, event: KeyboardEvent): void {
  const { valueElement, state } = editor;
  const direction = event.key === "ArrowUp" ? 1 : -1;
  const text = valueElement.textContent ?? "";
  const kind = stepKindOf(editor.row.name, text);
  const next = nudgeValue(text, { direction, step: stepFor(event, kind), kind });
  if (next === undefined) return;
  event.preventDefault();
  valueElement.textContent = next;
  save(editor, { value: next, makeEdit: nudgeEdit });
  state.wasNudged = true;
}

function leaveRow(editor: RowEditor, event: FocusEvent): void {
  const { valueElement, state } = editor;
  const typed = (valueElement.textContent ?? "").trim();
  if (typed === state.shown && !state.wasNudged) {
    valueElement.textContent = state.shown || "—";
    return;
  }
  if (typed !== state.shown) commit(editor, typed);
  const next = event.relatedTarget;
  focusAfterRender = next instanceof HTMLElement ? (next.dataset.row ?? "") : "";
  rerender();
}

function pressKey(editor: RowEditor, event: KeyboardEvent): void {
  const { valueElement, state } = editor;
  if (event.key === "Enter") {
    event.preventDefault();
    valueElement.blur();
  }
  if (event.key === "Escape") {
    valueElement.textContent = state.shown;
    valueElement.blur();
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") nudgeNumber(editor, event);
}

function createResetButton(editor: RowEditor): HTMLElement {
  const reset = h("button", "reset", "↩");
  reset.title = "Reset to the page's own value";
  reset.addEventListener("click", () => {
    commit(editor, "");
    rerender();
  });
  return reset;
}

export function createEditableRow(row: CssRow, target: RowTarget): HTMLElement {
  const { rowElement, valueElement } = createRowShell(row);
  const editor = { row, target, valueElement, state: { shown: row.value, wasNudged: false } };

  valueElement.contentEditable = "true";
  valueElement.spellcheck = false;
  valueElement.dataset.row = (row.isCustom ? "custom:" : "") + row.name;
  valueElement.addEventListener("focus", () => {
    if (!editor.state.shown) valueElement.textContent = "";
  });
  valueElement.addEventListener("blur", (event) => leaveRow(editor, event));
  valueElement.addEventListener("keydown", (event) => pressKey(editor, event));
  if (row.isOverridden) rowElement.appendChild(createResetButton(editor));
  return rowElement;
}
