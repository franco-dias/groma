/** The buttons of a flex or grid container's controls: one per value, and one that opens the rest as a menu. */
import { h } from "../../dom";
import { edit } from "../../edits/changes";
import { flexGlyph } from "../../icons";
import { rerender } from "../../selection";
import type { FlexChoice, FlexControl } from "./flex-choices";
import { type MenuItem, toggleMenu } from "./row-menu";
import type { SpecsContext } from "./specs-context";

/** A control, the property's value on the page now, and the element it edits. */
export type ControlState = { control: FlexControl; now: string; context: SpecsContext };

function applyValue({ context, control }: ControlState, value: string): void {
  edit({ selector: context.selector, prop: control.prop, value, element: context.element });
}

export function isChecked([, value, ...alsoWhen]: FlexChoice, { control, now }: ControlState): boolean {
  // "row-reverse" is a row: the buttons choose the axis, not its sense.
  return [value, ...alsoWhen].includes(now) || (control.prop === "flex-direction" && now.startsWith(value));
}

export function createChoiceButton(choice: FlexChoice, state: ControlState): HTMLElement {
  const [glyph, value] = choice;
  const checked = isChecked(choice, state);
  const button = h("button", "segment");
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", String(checked));
  button.setAttribute("aria-label", value);
  button.title = `${state.control.prop}: ${value}`;
  button.dataset.value = value;
  button.appendChild(flexGlyph(glyph));
  button.addEventListener("click", () => {
    if (!checked) applyValue(state, value);
    rerender();
  });
  return button;
}

/** The values that share the last button of a control, and the row the menu opens under. */
export type MoreChoices = { choices: FlexChoice[]; row: HTMLElement };

function createMoreItems(state: ControlState, choices: FlexChoice[]): MenuItem[] {
  const { control, now } = state;
  return choices.map(([glyph, value]) => ({
    value,
    glyph: flexGlyph(glyph),
    hint: control.prop,
    checked: value === now,
    pick: () => {
      applyValue(state, value);
      rerender();
    },
  }));
}

/** The last button of a control: it opens the values that share it as a menu. */
export function createMoreButton({ choices, row }: MoreChoices, state: ControlState): HTMLElement {
  const { control, now } = state;
  const current = choices.find(([, value]) => value === now);
  const button = h("button", "segment");
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-checked", String(current !== undefined));
  button.setAttribute("aria-label", "Share out the space");
  button.title = `${control.prop}: ${current?.[1] ?? choices.map(([, value]) => value).join(", ")}`;
  button.dataset.value = "more";
  button.appendChild(flexGlyph(current?.[0] ?? choices[0][0]));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(row, { name: control.prop, items: createMoreItems(state, choices) });
  });
  return button;
}
