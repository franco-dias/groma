/**
 * Under a block: the design tokens its non-color values are declared with, as
 * "Gap  --spacing-4" lines. A color token in the same declaration (the color
 * of a `border` shorthand) is left to the Colors block, which names the one
 * on screen: here it would name a color the Layout cell does not show.
 */
import { config } from "../../config";
import { h } from "../../dom";
import type { Spec } from "../../specs/spec";
import { isColor } from "../../specs/colors";
import { declaredTokens, tokenPath } from "../../specs/tokens";
import { copyOnClick } from "../copy";
import type { SpecsContext } from "./specs-context";

/** A label, and the spec whose properties may be declared with tokens. */
export type TokenSource = [label: string, spec: Spec | undefined];

function nonColorTokens(context: SpecsContext, spec: Spec | undefined): string[] {
  const isColorToken = (token: string): boolean =>
    isColor(context.computedStyle.getPropertyValue(token).trim());
  const tokens = declaredTokens(context.element, { props: spec?.props ?? [], stylesOf: context.stylesOf });
  return tokens.filter((token) => !isColorToken(token));
}

export function createTokenNotes(context: SpecsContext, sources: TokenSource[]): HTMLElement[] {
  return sources.flatMap(([label, spec]) =>
    nonColorTokens(context, spec).map((token) => {
      const row = h("div", "wide");
      row.appendChild(h("span", "label", label));
      const path = tokenPath(token, config.tokenPrefixes);
      copyOnClick(row.appendChild(h("span", "token-note", path || token)), path || token);
      return row;
    }),
  );
}
