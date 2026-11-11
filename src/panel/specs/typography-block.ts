/** The Typography block of the Specs tab: family, weight, size, line height, tracking and text options. */
import { h } from "../../dom";
import { createCell } from "./cell";
import { editable } from "./editable-field";
import { addBlock } from "./specs-block";
import { findSpec, type SpecsContext } from "./specs-context";
import { createTokenNotes } from "./token-notes";
import { part } from "../tab";

/** A value of the block and the CSS property a double-click on it edits. */
type TextCell = { label: string; value: string | undefined; prop: string };

function textCells(context: SpecsContext): TextCell[] {
  const { computedStyle } = context;
  const text = (name: string): string | undefined => findSpec(context, ["Text", name])?.value;
  return [
    { label: "Weight", value: computedStyle.fontWeight, prop: "font-weight" },
    { label: "Size", value: computedStyle.fontSize, prop: "font-size" },
    { label: "Line", value: computedStyle.lineHeight, prop: "line-height" },
    { label: "Tracking", value: text("spacing"), prop: "letter-spacing" },
    { label: "Transform", value: text("transform"), prop: "text-transform" },
    { label: "Align", value: text("align"), prop: "text-align" },
    { label: "Decoration", value: text("decoration"), prop: "text-decoration-line" },
  ];
}

/** The first family is shown and copied; the field holds the whole list. */
function createFamilyCell(context: SpecsContext): HTMLElement {
  const { computedStyle } = context;
  const family = computedStyle.fontFamily.split(",")[0].replaceAll('"', "");
  const familyCell = createCell({ label: "Family", value: family }, context);
  editable(part(familyCell, ".value"), { context, prop: "font-family", value: computedStyle.fontFamily });
  return familyCell;
}

export function renderTypography(context: SpecsContext): void {
  const font = findSpec(context, ["Text", "font"]);
  if (!font) return;
  const section = addBlock(context, { title: "Typography" });
  section.appendChild(createFamilyCell(context));
  const grid = section.appendChild(h("div", "grid2"));
  textCells(context).forEach(({ label, value, prop }) => {
    if (value) grid.appendChild(createCell({ label, value, prop }, context));
  });
  section.append(...createTokenNotes(context, [["Font", font]]));
}
