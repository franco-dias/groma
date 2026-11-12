/** The first line of a color's row in the Specs tab: what the color is for, then swatch, value, alpha and badges. */
import { h } from "../../dom";
import { options } from "../../options";
import { colorParts } from "../../specs/color-format";
import { isColorValue } from "../../specs/colors";
import type { Spec } from "../../specs/spec";
import { copyOnClickMarking } from "../copy";
import { createBadges, createCopySlot, type TokenMatch } from "./color-parts";
import { editable } from "./editable-field";
import { createSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** A color of an element, what it is for, and the CSS property a double-click on it edits. */
export type ColorRole = { spec: Spec; role: string; prop?: string };

/** The row of a color, what its tokens say, and the element it describes. */
export type ColorRow = { row: HTMLElement; match: TokenMatch; context: SpecsContext };

/** What a double-click on the color opens: the hex when opaque, else the color as the page has it. */
function fieldValue(value: string): string {
  const { text, alpha } = colorParts(value, "hex");
  return alpha === undefined || alpha === "100%" ? text : value;
}

export function createLine(color: ColorRole, { row, match, context }: ColorRow): HTMLElement {
  const { spec, role, prop } = color;
  const { text, alpha } = colorParts(spec.value, options.colorFormat);
  const line = h("div", "token-line");
  line.append(h("span", "color-role", role), createSwatch(spec.value));
  const value = line.appendChild(copyOnClickMarking(h("span", "value", text), { text, row }));
  if (prop) editable(value, { context, prop, value: fieldValue(spec.value) });
  if (alpha && isColorValue(text)) line.appendChild(h("span", "alpha", alpha));
  line.append(...createBadges(match), h("span", "spacer"), createCopySlot());
  return line;
}
