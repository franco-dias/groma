/**
 * The Colors block of the Specs tab: each colour of an element with its
 * design token, in the order a developer reads it: the resolved value, the
 * theme path (what goes into `sx`), the CSS variable, then the value in each
 * theme. Every line copies on its own.
 */
import { config } from "../../config";
import { h } from "../../dom";
import { options } from "../../options";
import { formatColor, isColorValue } from "../../specs/colors";
import type { Spec } from "../../specs/spec";
import { tokenModes, tokenPath } from "../../specs/tokens";
import { copyOnClickMarking } from "../copy";
import { createBadges, createModes, createRoleSlot, matchTokens, type TokenMatch } from "./color-parts";
import { editable } from "./editable-field";
import { addBlock, createSwatch } from "./specs-block";
import { findSpec, type SpecsContext } from "./specs-context";

/** A colour of an element, what it is for, and the CSS property a double-click on it edits. */
type ColorRole = { spec: Spec; role: string; prop?: string };

/** The row of a colour, what its tokens say, and the element it describes. */
type ColorRow = { row: HTMLElement; match: TokenMatch; context: SpecsContext };

/** The line of the swatch, the value, the badges and the role. */
function createLine(color: ColorRole, { row, match, context }: ColorRow): HTMLElement {
  const { spec, role, prop } = color;
  const [hex, alpha = "100%"] = formatColor(spec.value).split(" ");
  const line = h("div", "token-line");
  line.appendChild(createSwatch(spec.value));
  const value = line.appendChild(copyOnClickMarking(h("span", "value", hex), { text: hex, row }));
  // The field holds the hex; a translucent colour keeps its alpha as rgba().
  if (prop) editable(value, { context, prop, value: alpha === "100%" ? hex : spec.value });
  if (isColorValue(hex)) line.appendChild(h("span", "alpha", alpha));
  line.append(...createBadges(match), h("span", "spacer"), createRoleSlot(role));
  return line;
}

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
  // A colour the design wrote by hand that happens to equal a token.
  const similarLines = similar
    .slice(0, 2)
    .map((token) => copies(h("div", "css-var is-secondary", token), token));
  const warning = isMissing ? [h("div", "warn-text", "Hard-coded value. No token has this colour.")] : [];
  return [...lines, ...similarLines, ...warning];
}

function createColorRow(color: ColorRole, context: SpecsContext): HTMLElement {
  const row = h("div", "token-row");
  const match = matchTokens(color.spec, context);
  row.classList.toggle("is-missing", match.isMissing);
  row.appendChild(createLine(color, { row, match, context }));
  row.append(...createTokenLines(match, { row, match, context }));
  return row;
}

/** Each colour of an element, with the CSS property a double-click on it edits. */
const COLOR_ROLES: [section: string, name: string, role: string, prop: string][] = [
  ["Shape", "background", "Background", "background-color"],
  ["Shape", "border color", "Border", "border-color"],
  ["Text", "color", "Text", "color"],
  ["Icon", "fill", "Fill", "fill"],
  ["Icon", "stroke", "Stroke", "stroke"],
];

export function renderColors(context: SpecsContext): void {
  const rows = COLOR_ROLES.flatMap(([section, name, role, prop]) => {
    const spec = findSpec(context, [section, name]);
    return spec ? [createColorRow({ spec, role, prop }, context)] : [];
  });
  if (options.pickedColor) {
    const picked = { name: "picked", value: options.pickedColor, color: true };
    rows.push(createColorRow({ spec: picked, role: "Picked" }, context));
  }
  if (!rows.length) return;
  addBlock(context, { title: "Colors" })
    .appendChild(h("div", "token-rows"))
    .append(...rows);
}
