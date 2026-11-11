/** Under a block: the design tokens its non-colour values are declared with, as "Gap  --spacing-4" lines. */
import { config } from "../../config";
import { h } from "../../dom";
import type { Spec } from "../../specs/spec";
import { declaredTokens, tokenPath } from "../../specs/tokens";
import { copyOnClick } from "../copy";
import type { SpecsContext } from "./specs-context";

/** A label, and the spec whose properties may be declared with tokens. */
export type TokenSource = [label: string, spec: Spec | undefined];

export function createTokenNotes(context: SpecsContext, sources: TokenSource[]): HTMLElement[] {
  return sources.flatMap(([label, spec]) =>
    declaredTokens(context.element, { props: spec?.props ?? [], stylesOf: context.stylesOf }).map((token) => {
      const row = h("div", "wide");
      row.appendChild(h("span", "label", label));
      const path = tokenPath(token, config.tokenPrefixes);
      copyOnClick(row.appendChild(h("span", "token-note", path || token)), path || token);
      return row;
    }),
  );
}
