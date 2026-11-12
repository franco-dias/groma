/** The parts of a color's row in the Specs tab: what its tokens say, the badges, the copy marks and the themes. */
import { h } from "../../dom";
import { icon } from "../../icons";
import { isColorValue, sameColor, tokensWithColor } from "../../specs/colors";
import type { Spec } from "../../specs/spec";
import { declaredTokens, hasTokens, scopeName } from "../../specs/tokens";
import { copyOnClick } from "../copy";
import { createSmallSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** What a color's tokens say about it. */
export type TokenMatch = { declared: string[]; similar: string[]; isMissing: boolean };

/** The token's value in each theme; the theme the page is using stands out. */
export function createModes(modes: [scope: string, value: string][], current: string): HTMLElement {
  const line = h("div", "modes");
  modes.forEach(([scope, value]) => {
    const mode = line.appendChild(h("span", value === current ? "mode is-active" : "mode"));
    if (isColorValue(value)) mode.appendChild(createSmallSwatch(value));
    mode.append(value, h("span", "scope", scopeName(scope)));
    copyOnClick(mode, value);
  });
  return line;
}

/**
 * The declared tokens that hold the color on screen. Two rules can name two
 * tokens for one color (`border` in the base rule, `border-color` in a
 * selected state): only the one in effect is the element's. When none holds
 * it (a token inside `color-mix()`), all of them are kept.
 */
function liveTokens(
  declared: string[],
  { color, context }: { color: Spec; context: SpecsContext },
): string[] {
  const holds = (token: string): boolean =>
    sameColor(context.computedStyle.getPropertyValue(token).trim(), color.value);
  const live = declared.filter(holds);
  return live.length ? live : declared;
}

export function matchTokens(color: Spec, context: SpecsContext): TokenMatch {
  const { element, computedStyle, stylesOf } = context;
  const declared = liveTokens(declaredTokens(element, { props: color.props ?? [], stylesOf }), {
    color,
    context,
  });
  const hasPageTokens = hasTokens(computedStyle);
  const similar = declared.length || !hasPageTokens ? [] : tokensWithColor(computedStyle, color.value);
  return { declared, similar, isMissing: !declared.length && !similar.length && hasPageTokens };
}

export function createBadges({ similar, isMissing }: TokenMatch): HTMLElement[] {
  const matches = similar.length ? [h("span", "badge", "Matches token")] : [];
  if (!isMissing) return matches;
  const warning = h("span", "badge is-warn");
  warning.append(icon("warning", 10), "No token");
  return [...matches, warning];
}

/** The "Copy" hint and the "Copied" mark, which share one slot at the end of the line. */
export function createCopySlot(): HTMLElement {
  const slot = h("span", "copy-slot");
  slot.appendChild(h("span", "copy-hint")).append(icon("copy", 12), "Copy");
  slot.appendChild(h("span", "copied")).append(icon("check", 12), "Copied");
  return slot;
}
