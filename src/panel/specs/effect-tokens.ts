/**
 * Tokens under the Effects block's rows: the token that has a color (a
 * shadow's, a gradient stop's) or a whole shadow value, as "matches token
 * --name", and the token a property is declared with.
 */
import { config } from "../../config";
import { h } from "../../dom";
import { options } from "../../options";
import { isColor, tokensWithColor } from "../../specs/colors";
import type { Fit } from "../../specs/suggest";
import { declaredTokens, tokenPath } from "../../specs/tokens";
import { copyOnClick } from "../copy";
import { findFieldTokens } from "../token-list/field-tokens";
import { makeHolds } from "../token-list/token-holds";
import { rootFontSize } from "./display";
import type { SpecsContext } from "./specs-context";

function createMatchLine(token: string): HTMLElement {
  const line = h("div", "effect-token");
  line.append(h("span", "hint", "matches token"), " ", copyOnClick(h("span", "css-var", token), token));
  return line;
}

/** The lines for the (up to two) tokens whose color is `color`; none for a color no token has. */
export function createColorTokenLines(color: string, context: SpecsContext): HTMLElement[] {
  if (!isColor(color)) return [];
  return tokensWithColor(context.computedStyle, color).slice(0, 2).map(createMatchLine);
}

/** A property and the kind of token it takes, if the tokens that hold its value are to be named. */
export type TokenSubject = { prop: string; value: string; fit?: Fit };

/** The token the element declares the property with, or else the tokens that hold its value. */
export function createGroupTokenLines(subject: TokenSubject, context: SpecsContext): HTMLElement[] {
  const { prop, value, fit } = subject;
  const declared = declaredTokens(context.element, { props: [prop], stylesOf: context.stylesOf });
  if (declared.length) return declared.map((token) => createDeclaredLine(token));
  if (!fit) return [];
  const holds = makeHolds(fit, { rootFontSize: rootFontSize(), bareUnit: options.unit })(value);
  return findFieldTokens(context.computedStyle, fit)
    .filter((token) => holds(token.value))
    .slice(0, 2)
    .map(({ name }) => createMatchLine(name));
}

function createDeclaredLine(token: string): HTMLElement {
  const text = tokenPath(token, config.tokenPrefixes) || token;
  const line = h("div", "effect-declared");
  line.appendChild(copyOnClick(h("span", "token-note", text), text));
  return line;
}
