/** The gradient rows of the Effects block: a strip painted with the gradient, its kind and direction, and its stops. */
import { h } from "../../dom";
import { options } from "../../options";
import { formatColorAs } from "../../specs/color-format";
import type { Gradient, GradientStop } from "../../specs/gradients";
import { copyOnClick } from "../copy";
import { createColorTokenLines } from "./effect-tokens";
import { createSmallSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** A stop's color in the chosen format, its position, and the token that has its color. */
function addStop({
  row,
  stop,
  context,
}: {
  row: HTMLElement;
  stop: GradientStop;
  context: SpecsContext;
}): void {
  const { color, position } = stop;
  const text = formatColorAs(color, options.colorFormat);
  const line = copyOnClick(row.appendChild(h("div", "effect-stop")), text);
  line.append(createSmallSwatch(color), h("span", "value", text), h("span", "hint", position));
  row.append(...createColorTokenLines(color, context));
}

function createGradientRow(gradient: Gradient, context: SpecsContext): HTMLElement {
  const row = h("div", "effect-row");
  const head = copyOnClick(row.appendChild(h("div", "effect-line is-gradient")), gradient.text);
  const strip = head.appendChild(h("span", "gradient-strip"));
  strip.style.setProperty("--gradient", gradient.text);
  head.appendChild(h("span", "gradient-kind", gradient.description));
  gradient.stops.forEach((stop) => addStop({ row, stop, context }));
  return row;
}

export const createGradientRows = (gradients: Gradient[], context: SpecsContext): HTMLElement[] =>
  gradients.map((gradient) => createGradientRow(gradient, context));
