/** Design tokens: the CSS variables a design declares its values with. */
import { forEachPageRule, type StyleLookup } from "../page-styles";

/** Properties a child takes from its parent when it declares none. */
const INHERITED = new Set([
  "color",
  "fill",
  "stroke",
  "font",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
]);

/**
 * The tokens named in the declarations that set `props` on an element.
 * Text and icon colours usually come from an ancestor, so for inherited
 * properties the search walks up until some element declares one.
 */
export function declaredTokens(el: Element, props: string[], stylesOf: StyleLookup): string[] {
  const inherits = props.length > 0 && props.every((prop) => INHERITED.has(prop));
  for (let node: Element | null = el; node; node = inherits ? node.parentElement : null) {
    const styles = stylesOf(node);
    const values = props
      .map((prop) => styles.findLast((style) => style.getPropertyValue(prop))?.getPropertyValue(prop))
      .filter((value) => value !== undefined);
    if (!values.length) continue;
    const names = values.flatMap((value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)]);
    return [...new Set(names.map((match) => match[1]))];
  }
  return [];
}

/** "--mui-palette-background-paper" -> "palette.background.paper", the path in the MUI theme. */
export const themePath = (token: string): string =>
  token.startsWith("--mui-") ? token.slice(6).replaceAll("-", ".") : "";

const modesByToken = new Map<string, [scope: string, value: string][]>();

/**
 * The token's value in every scope that sets it, for example ":root, .light"
 * and ".dark". Empty when the token has the same value everywhere.
 */
export function tokenModes(token: string): [scope: string, value: string][] {
  let modes = modesByToken.get(token);
  if (!modes) {
    const byScope = new Map<string, string>();
    forEachPageRule((rule) => {
      const value = rule.style.getPropertyValue(token).trim();
      if (value) byScope.set(rule.selectorText, value);
    });
    modes = new Set(byScope.values()).size > 1 ? [...byScope] : [];
    modesByToken.set(token, modes);
  }
  return modes;
}

/** True when the page defines any CSS variable the element can see. */
export const hasTokens = (cs: CSSStyleDeclaration): boolean =>
  Array.from(cs).some((prop) => prop.startsWith("--"));
