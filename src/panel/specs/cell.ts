/** A label with a value that copies on click, and edits on double-click when it is one CSS property. */
import { h } from "../../dom";
import { copyOnClick } from "../copy";
import { copied, shown } from "./display";
import { editable } from "./editable-field";
import type { SpecsContext } from "./specs-context";

/**
 * A labelled value. `prop` is the CSS property the value is: with it a
 * double-click edits the value; without it the value only copies.
 */
export type CellField = { label: string; value: string; prop?: string };

function buildCell(
  { className, label, value, prop }: CellField & { className: string },
  context: SpecsContext,
): HTMLElement {
  const row = h("div", className);
  row.appendChild(h("span", "label", label));
  const node = copyOnClick(row.appendChild(h("span", "value", shown(value))), copied(value));
  if (!prop) {
    // Dimmed, so the values a double-click edits stand out beside it.
    node.classList.add("is-readonly");
    return row;
  }
  editable(node, { context, prop, value });
  return row;
}

/** A cell for a short value, two to a line. */
export const createCell = (field: CellField, context: SpecsContext): HTMLElement =>
  buildCell({ ...field, className: "cell" }, context);

/** A cell that takes the whole line, so a long value can wrap. */
export const createWideCell = (field: CellField, context: SpecsContext): HTMLElement =>
  buildCell({ ...field, className: "wide" }, context);
