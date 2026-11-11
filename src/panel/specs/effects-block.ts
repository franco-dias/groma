/**
 * The Effects block of the Specs tab: shadows, text shadows, filters,
 * backdrop filters and gradients, each part on a row. A click on a row copies
 * that one part as CSS; a click on a group's label copies the whole property;
 * a double-click on the label edits the whole property as text. The block is
 * there only when the element has an effect.
 */
import { h } from "../../dom";
import { parseFilters, parseShadows } from "../../specs/effects";
import { parseGradients } from "../../specs/gradients";
import type { Fit } from "../../specs/suggest";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import { createGroupTokenLines } from "./effect-tokens";
import { createFilterRows, createShadowRows } from "./effect-rows";
import { createGradientRows } from "./gradient-rows";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** A property, the label of its group, and how to turn its value into rows. */
type Group = {
  label: string;
  prop: string;
  fit?: Fit;
  rows: (value: string, context: SpecsContext) => HTMLElement[];
};

const GROUPS: Group[] = [
  {
    label: "Shadow",
    prop: "box-shadow",
    fit: "shadow",
    rows: (value, context) => createShadowRows(parseShadows(value), context),
  },
  {
    label: "Text shadow",
    prop: "text-shadow",
    fit: "shadow",
    rows: (value, context) => createShadowRows(parseShadows(value), context),
  },
  { label: "Filter", prop: "filter", rows: (value) => createFilterRows(parseFilters(value)) },
  {
    label: "Backdrop filter",
    prop: "backdrop-filter",
    rows: (value) => createFilterRows(parseFilters(value)),
  },
  {
    label: "Gradient",
    prop: "background-image",
    rows: (value, context) => createGradientRows(parseGradients(value), context),
  },
];

/** The group's label: copies the whole value, and a double-click edits it as text. */
function createLabel(
  { label, prop }: Group,
  { value, context }: { value: string; context: SpecsContext },
): HTMLElement {
  const node = copyOnClick(h("span", "effect-label", label), value);
  return editable(node, { context, prop, value });
}

function createGroup(group: Group, context: SpecsContext): HTMLElement[] {
  const value = context.computedStyle.getPropertyValue(group.prop).trim();
  const rows = group.rows(value, context);
  if (!rows.length) return [];
  const element = h("div", "effect-group");
  element.append(
    createLabel(group, { value, context }),
    ...rows,
    ...createGroupTokenLines({ prop: group.prop, value, fit: group.fit }, context),
  );
  return [element];
}

export function renderEffects(context: SpecsContext): void {
  const groups = GROUPS.flatMap((group) => createGroup(group, context));
  if (!groups.length) return;
  addBlock(context, { title: "Effects", className: "effects" }).append(...groups);
}
