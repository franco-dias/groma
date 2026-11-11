/**
 * A flex container's direction and where it puts its items, as buttons: the
 * drawings are turned to the container's direction, so each shows what it
 * does on the page. The ways to share out the space (`space-between`,
 * `space-around`, `space-evenly`) are a menu behind one button, each named
 * with the property it sets. A value no button stands for (`baseline`) is
 * shown after them, to edit as text.
 *
 * A grid has the same buttons for where each item sits in its cell.
 */
import { h } from "../../dom";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import { createChoiceButton, type ControlState, createMoreButton, isChecked } from "./flex-buttons";
import { FLEX_CONTROLS, type FlexControl, GRID_CONTROLS } from "./flex-choices";
import type { SpecsContext } from "./specs-context";

function createControlRow(control: FlexControl, context: SpecsContext): HTMLElement {
  const { label, prop, axis, choices, more } = control;
  const state = { control, now: context.computedStyle.getPropertyValue(prop), context };
  const row = h("div", "cell flex-control");
  row.dataset.prop = prop;
  const name = row.appendChild(h("span", "label", label));
  name.title = axis ? `${prop}: where the items sit ${axis}` : prop;
  const group = row.appendChild(h("div", "segmented"));
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", label);
  group.append(...choices.map((choice) => createChoiceButton(choice, state)));
  if (more) group.appendChild(createMoreButton({ choices: more, row }, state));
  row.append(...createAfterwords(state, context));
  return row;
}

/** What follows the buttons: the raw value when no button stands for it, the wrap, the axis. */
function createAfterwords(state: ControlState, context: SpecsContext): HTMLElement[] {
  const { control, now } = state;
  const { prop, axis, choices, more } = control;
  const isShown =
    choices.some((choice) => isChecked(choice, state)) || more?.some(([, value]) => value === now);
  const raw = isShown ? [] : [createRawValue(now, { context, prop })];
  const wrap = context.computedStyle.flexWrap;
  const wrapHint = prop === "flex-direction" && wrap !== "nowrap" ? [h("span", "hint", wrap)] : [];
  return [...raw, ...wrapHint, ...(axis ? [h("span", "hint", axis)] : [])];
}

/** A value no button stands for (`baseline`), to edit as text. */
function createRawValue(now: string, field: { context: SpecsContext; prop: string }): HTMLElement {
  return editable(copyOnClick(h("span", "value", now), now), { ...field, value: now });
}

function createControls(controls: FlexControl[], context: SpecsContext): HTMLElement {
  const container = h("div", "flex-controls");
  container.append(...controls.map((control) => createControlRow(control, context)));
  return container;
}

export function createFlexControls(context: SpecsContext): HTMLElement {
  const container = createControls(FLEX_CONTROLS, context);
  container.classList.toggle("is-column", context.computedStyle.flexDirection.startsWith("column"));
  return container;
}

/** A grid's drawings are never turned: across is always the inline axis. */
export function createGridControls(context: SpecsContext): HTMLElement {
  return createControls(GRID_CONTROLS, context);
}
