/**
 * The rows of the Effects block: one shadow, one filter function. Each copies
 * itself as CSS on a click. A box shadow says whether it is a drop or an inner
 * shadow, and its offsets, blur and spread are labeled; a filter function
 * says in a sentence what it does.
 */
import { h } from "../../dom";
import { options } from "../../options";
import { formatColorAs } from "../../specs/color-format";
import type { FilterFunction, Shadow } from "../../specs/effects";
import { describeFilter } from "../../specs/filter-notes";
import { copyOnClick } from "../copy";
import { shown } from "./display";
import { createColorTokenLines } from "./effect-tokens";
import { createSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** A shadow, and whether it is a box's (which has a kind and a spread) or a text's. */
type ShadowOf = { shadow: Shadow; isBox: boolean };

/** "x 0", "y 4", "blur 12", "spread 1" in the tab's unit; a text shadow has no spread. */
function createShadowParts({ x, y, blur, spread }: Shadow): HTMLElement {
  const parts = h("div", "shadow-parts");
  const named: [label: string, length: string | undefined][] = [
    ["x", x],
    ["y", y],
    ["blur", blur],
    ["spread", spread],
  ];
  named
    .filter(([, length]) => length !== undefined)
    .forEach(([label, length]) =>
      parts
        .appendChild(h("span", "shadow-part"))
        .append(h("span", "part-label", label), ` ${shown(length ?? "")}`),
    );
  return parts;
}

function createShadowRow({ shadow, isBox }: ShadowOf, context: SpecsContext): HTMLElement {
  const color = shadow.color || "currentcolor";
  const row = h("div", "effect-row");
  const line = copyOnClick(row.appendChild(h("div", "effect-line")), shadow.text);
  line.appendChild(createSwatch(color));
  if (isBox) line.appendChild(h("span", "shadow-kind", shadow.inset ? "Inner shadow" : "Drop shadow"));
  line.appendChild(h("span", "hint", formatColorAs(color, options.colorFormat)));
  row.append(createShadowParts(shadow), ...createColorTokenLines(color, context));
  return row;
}

export const createBoxShadowRows = (shadows: Shadow[], context: SpecsContext): HTMLElement[] =>
  shadows.map((shadow) => createShadowRow({ shadow, isBox: true }, context));

export const createTextShadowRows = (shadows: Shadow[], context: SpecsContext): HTMLElement[] =>
  shadows.map((shadow) => createShadowRow({ shadow, isBox: false }, context));

function createFilterRow({ filter, prop }: { filter: FilterFunction; prop: string }): HTMLElement {
  const row = h("div", "effect-row");
  const line = copyOnClick(row.appendChild(h("div", "effect-line")), filter.text);
  line.append(h("span", "name", filter.name), h("span", "value", filter.argument));
  const note = describeFilter(filter.name, prop);
  if (note) row.appendChild(h("div", "effect-note", note));
  return row;
}

/** The functions of `filter` or `backdrop-filter`, `prop` saying which, since a note depends on it. */
export const createFilterRows = (filters: FilterFunction[], prop: string): HTMLElement[] =>
  filters.map((filter) => createFilterRow({ filter, prop }));
