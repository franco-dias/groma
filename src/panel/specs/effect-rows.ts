/** The rows of the Effects block: one shadow, one filter function. Each copies itself as CSS on a click. */
import { h } from "../../dom";
import { options } from "../../options";
import { formatColorAs } from "../../specs/color-format";
import type { FilterFunction, Shadow } from "../../specs/effects";
import { copyOnClick } from "../copy";
import { shown } from "./display";
import { createColorTokenLines } from "./effect-tokens";
import { createSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** "0 4 12 0": offsets, blur and spread (a text shadow has none) in the tab's unit. */
function lengthsText({ x, y, blur, spread }: Shadow): string {
  return [x, y, blur, spread]
    .filter((length) => length !== undefined)
    .map(shown)
    .join(" ");
}

function createShadowRow(shadow: Shadow, context: SpecsContext): HTMLElement {
  const color = shadow.color || "currentcolor";
  const row = h("div", "effect-row");
  const line = copyOnClick(row.appendChild(h("div", "effect-line")), shadow.text);
  line.appendChild(createSwatch(color));
  if (shadow.inset) line.appendChild(h("span", "badge", "inset"));
  line.append(
    h("span", "value", lengthsText(shadow)),
    h("span", "hint", formatColorAs(color, options.colorFormat)),
  );
  row.append(...createColorTokenLines(color, context));
  return row;
}

export const createShadowRows = (shadows: Shadow[], context: SpecsContext): HTMLElement[] =>
  shadows.map((shadow) => createShadowRow(shadow, context));

function createFilterRow({ name, argument, text }: FilterFunction): HTMLElement {
  const row = h("div", "effect-row");
  const line = copyOnClick(row.appendChild(h("div", "effect-line")), text);
  line.append(h("span", "name", name), h("span", "value", argument));
  return row;
}

export const createFilterRows = (filters: FilterFunction[]): HTMLElement[] => filters.map(createFilterRow);
