/** The parts of a colour's row in the Specs tab: what its tokens say, the badges, the role and the themes. */
import { h } from "../../dom";
import { icon } from "../../icons";
import { isColorValue, tokensWithColor } from "../../specs/colors";
import type { Spec } from "../../specs/spec";
import { declaredTokens, hasTokens, scopeName } from "../../specs/tokens";
import { copyOnClick } from "../copy";
import { createSmallSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** What a colour's tokens say about it. */
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

export function matchTokens(color: Spec, context: SpecsContext): TokenMatch {
  const { element, computedStyle, stylesOf } = context;
  const declared = declaredTokens(element, { props: color.props ?? [], stylesOf });
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

export function createRoleSlot(role: string): HTMLElement {
  const slot = h("span", "role");
  slot.appendChild(h("span", "name", role));
  slot.appendChild(h("span", "copy-hint")).append(icon("copy", 12), "Copy");
  slot.appendChild(h("span", "copied")).append(icon("check", 12), "Copied");
  return slot;
}
