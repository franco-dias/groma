/** One edited element in the Edits tab's list: its name, its before → after values and its note. */
import { elementName } from "../../element-name";
import { removeEdit } from "../../edits/changes";
import type { ElementEdits, ValueEdit } from "../../edits/edit-list";
import { CONTENT, findEdited, NOTE } from "../../edits/edit-values";
import { h } from "../../dom";
import { findPinnedElement, pin } from "../../selection";

/** The edit a reset button takes off, and what it says about it. */
type Reset = { title: string; selector: string; prop: string };

function createResetButton({ title, selector, prop }: Reset, onChange: () => void): HTMLElement {
  const reset = h("button", "reset", "↩");
  reset.title = title;
  reset.addEventListener("click", () => {
    removeEdit({ selector, prop });
    onChange();
  });
  return reset;
}

function createHead(selector: string, element: Element | undefined): HTMLElement {
  const head = h("button", "edited-head");
  head.append(
    h("span", "edited-name", element ? elementName(element) : "Not on the page now"),
    // The marks keep the selector reading left to right in a box that is cut at its start.
    h("span", "edited-selector", `‎${selector}‎`),
  );
  head.title = element ? "Pin this element" : selector;
  head.disabled = !element;
  head.classList.toggle("is-pinned", element !== undefined && element === findPinnedElement());
  head.addEventListener("click", () => element?.isConnected && pin(element));
  return head;
}

function createValueRow(
  { selector, ...edit }: ValueEdit & { selector: string },
  onChange: () => void,
): HTMLElement {
  const { prop, before, after } = edit;
  const row = h("div", "row edit-row");
  row.appendChild(h("span", "name", prop === CONTENT ? "content" : prop));
  const value = row.appendChild(h("span", "value"));
  if (before !== undefined) value.append(h("span", "before", before), h("span", "arrow", " → "));
  value.appendChild(h("span", "after", after));
  value.title = before === undefined ? after : `${before} → ${after}`;
  const title = "Remove this edit and put back the page's own value";
  row.appendChild(createResetButton({ title, selector, prop }, onChange));
  return row;
}

function createNoteRow(
  { selector, note }: { selector: string; note: string },
  onChange: () => void,
): HTMLElement {
  const row = h("div", "row edit-row is-note");
  row.append(h("span", "name", "note"), h("span", "value", note));
  row.appendChild(createResetButton({ title: "Remove this note", selector, prop: NOTE }, onChange));
  return row;
}

/** `onChange` runs after the user resets a value, so the list can draw again. */
export function createEditedElement(
  { selector, values, note }: ElementEdits,
  onChange: () => void,
): HTMLElement {
  const group = h("div", "edited");
  group.appendChild(createHead(selector, findEdited(selector)));
  values.forEach((edit) => group.appendChild(createValueRow({ selector, ...edit }, onChange)));
  if (note) group.appendChild(createNoteRow({ selector, note }, onChange));
  return group;
}
