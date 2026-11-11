/**
 * The size row of the Layout block: the width and height to copy or edit, and
 * beside them how each axis is set. An axis is fixed, hugs its content or
 * fills its parent; a click on the word changes it.
 */
import { h } from "../../dom";
import { edit } from "../../edits/changes";
import { together } from "../../edits/history";
import { sizeText } from "../../element-name";
import { icon, type Intent, intentGlyph } from "../../icons";
import { declaredValue } from "../../page-styles";
import { rerender } from "../../selection";
import { type Axis, sizingContext, sizingDeclarations } from "../../specs/sizing";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import { type MenuItem, toggleMenu } from "./row-menu";
import type { SpecsContext } from "./specs-context";

const INTENTS: [intent: Intent, meaning: string][] = [
  ["fixed", "a set size"],
  ["hug", "as big as its content"],
  ["fill", "as big as its parent allows"],
];

/** The axis to set, and the intent to give it. */
type IntentChange = { axis: Axis; intent: Intent };

/**
 * Gives an axis of the pinned element a sizing intent. It may take two
 * properties (in a flex parent, filling is growing or stretching); they are
 * one step to undo. A property that already has the value is left alone.
 */
function setIntent(
  { element, computedStyle, stylesOf, selector, saved }: SpecsContext,
  change: IntentChange,
): void {
  const { axis, intent } = change;
  const now = (prop: string): string =>
    prop === axis ? declaredValue(stylesOf(element), prop) || "auto" : computedStyle.getPropertyValue(prop);
  const declarations = sizingDeclarations(
    { axis, intent, size: computedStyle.getPropertyValue(axis) },
    sizingContext(element, axis),
  ).filter(([prop, value]) => prop in saved || now(prop) !== value);
  together(() => declarations.forEach(([prop, value]) => edit({ selector, prop, value, element })));
  rerender();
}

/**
 * One value to copy, "444 × 382", made of two to edit. The fields hold the
 * CSS width and height, which leave out padding and border on an element
 * sized by its content box; the size shown is the whole box.
 */
function createSizeValue(context: SpecsContext): HTMLElement {
  const { computedStyle } = context;
  const size = sizeText(context.element);
  const [width, height] = size.split(" × ");
  const value = copyOnClick(h("span", "value"), size);
  const widthField = editable(h("span", "", width), { context, prop: "width", value: computedStyle.width });
  const heightField = editable(h("span", "", height), {
    context,
    prop: "height",
    value: computedStyle.height,
  });
  value.append(widthField, h("span", "times", " × "), heightField);
  if (computedStyle.boxSizing === "content-box") {
    // Said only where it surprises: the field will not hold the number shown.
    const note = ". content-box: the CSS value leaves out padding and border";
    widthField.title += note;
    heightField.title += note;
  }
  return value;
}

/** The row of the size, and the context a button of it needs to open its menu. */
type SizeRow = { row: HTMLElement; context: SpecsContext };

function createIntentItems({ axis, intent: word }: IntentChange, context: SpecsContext): MenuItem[] {
  // The intent it has already: nothing to set, even where the element
  // has it by default and no declaration says so.
  const pick = (value: Intent): (() => void) =>
    value === word ? rerender : () => setIntent(context, { axis, intent: value });
  return INTENTS.map(([value, hint]) => ({
    value,
    glyph: intentGlyph(value),
    hint,
    checked: value === word,
    pick: pick(value),
  }));
}

function createIntentButton(current: IntentChange, { row, context }: SizeRow): HTMLElement {
  const { axis, intent: word } = current;
  const item = h("button", `intent is-${axis}`);
  const chevron = icon("chevronDown", 10);
  chevron.classList.add("chevron");
  item.append(intentGlyph(word), word, chevron);
  item.title = `How the ${axis} is set. Click to change it`;
  item.setAttribute("aria-haspopup", "menu");
  item.addEventListener("click", (event) => {
    // The body's click closes the menu (see `mount`): this one opens it.
    event.stopPropagation();
    toggleMenu(row, { name: axis, items: createIntentItems(current, context) });
  });
  return item;
}

/** "fill × hug": each word with its glyph; the height glyph is turned 90°. */
function createIntents(intents: string, owner: SizeRow): HTMLElement {
  // Cast: the note `sizingIntent` wrote is two intents joined by " × ".
  const [widthIntent, heightIntent] = intents.split(" × ") as Intent[];
  const list = h("span", "intents");
  list.append(
    createIntentButton({ axis: "width", intent: widthIntent }, owner),
    h("span", "", "×"),
    createIntentButton({ axis: "height", intent: heightIntent }, owner),
  );
  return list;
}

export function createSizeRow(context: SpecsContext, intents: string): HTMLElement {
  const row = h("div", "size-row");
  row.append(h("span", "label", "Size"), createSizeValue(context), h("span", "spacer"));
  row.appendChild(createIntents(intents, { row, context }));
  return row;
}
