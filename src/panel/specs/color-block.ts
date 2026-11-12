/**
 * The Colors block of the Specs tab: each color of an element with its
 * design token, in the order a developer reads it: what the color is for
 * (Background, Border, Text…), the resolved value, the theme path (what goes
 * into `sx`), the CSS variable, then the value in each theme. A color with no
 * opacity at all is left out, since nothing on screen has it. Every line
 * copies on its own.
 */
import { config } from "../../config";
import { h } from "../../dom";
import { options } from "../../options";
import { colorParts } from "../../specs/color-format";
import { tokenModes, tokenPath } from "../../specs/tokens";
import { copyOnClickMarking } from "../copy";
import { createLine, type ColorRole, type ColorRow } from "./color-line";
import { createFormatSwitch } from "./color-format-switch";
import { createContrastLines } from "./contrast-line";
import { createModes, matchTokens, type TokenMatch } from "./color-parts";
import { addBlock } from "./specs-block";
import { findSpec, type SpecsContext } from "./specs-context";

function createTokenLines(
  { declared, similar, isMissing }: TokenMatch,
  { row, context }: ColorRow,
): HTMLElement[] {
  const copies = (node: HTMLElement, text: string): HTMLElement => copyOnClickMarking(node, { text, row });
  const lines = declared.flatMap((token) => {
    const path = tokenPath(token, config.tokenPrefixes);
    const modes = tokenModes(token);
    return [
      ...(path ? [copies(h("div", "theme-path", path), path)] : []),
      copies(h("div", path ? "css-var is-secondary" : "css-var", token), token),
      ...(modes.length ? [createModes(modes, context.computedStyle.getPropertyValue(token).trim())] : []),
    ];
  });
  // A color the design wrote by hand that happens to equal a token.
  const similarLines = similar
    .slice(0, 2)
    .map((token) => copies(h("div", "css-var is-secondary", token), token));
  const warning = isMissing ? [h("div", "warn-text", "Hard-coded value. No token has this color.")] : [];
  return [...lines, ...similarLines, ...warning];
}

function createColorRow(color: ColorRole, context: SpecsContext): HTMLElement {
  const row = h("div", "token-row");
  const match = matchTokens(color.spec, context);
  row.classList.toggle("is-missing", match.isMissing);
  row.appendChild(createLine(color, { row, match, context }));
  if (color.role === "Text") row.append(...createContrastLines(context));
  row.append(...createTokenLines(match, { row, match, context }));
  return row;
}

/** Each color of an element, with the CSS property a double-click on it edits. */
const COLOR_ROLES: [section: string, name: string, role: string, prop: string][] = [
  ["Shape", "background", "Background", "background-color"],
  ["Shape", "border color", "Border", "border-color"],
  ["Text", "color", "Text", "color"],
  ["Icon", "fill", "Fill", "fill"],
  ["Icon", "stroke", "Stroke", "stroke"],
];

/** A fully transparent color: a border kept only to hold its space, text painted by a gradient. */
const isInvisible = (value: string): boolean => colorParts(value, "hex").alpha === "0%";

export function renderColors(context: SpecsContext): void {
  const rows = COLOR_ROLES.flatMap(([section, name, role, prop]) => {
    const spec = findSpec(context, [section, name]);
    return spec && !isInvisible(spec.value) ? [createColorRow({ spec, role, prop }, context)] : [];
  });
  if (options.pickedColor) {
    const picked = { name: "picked", value: options.pickedColor, color: true };
    rows.push(createColorRow({ spec: picked, role: "Picked" }, context));
  }
  if (!rows.length) return;
  addBlock(context, { title: "Colors", action: createFormatSwitch(context.body) })
    .appendChild(h("div", "token-rows"))
    .append(...rows);
}
