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

/** The properties to look at, and how to read the declarations that apply to an element. */
export type TokenQuery = { props: string[]; stylesOf: StyleLookup };

/**
 * The tokens named in the declarations that set `props` on an element.
 * Text and icon colours usually come from an ancestor, so for inherited
 * properties the search walks up until some element declares one.
 */
export function declaredTokens(element: Element, query: TokenQuery): string[] {
  const inherits = query.props.length > 0 && query.props.every((prop) => INHERITED.has(prop));
  return tokensFrom(element, { ...query, inherits });
}

function tokensFrom(node: Element | undefined, query: TokenQuery & { inherits: boolean }): string[] {
  if (!node) return [];
  const values = declaredValues(node, query);
  if (values.length) return tokenNames(values);
  return query.inherits ? tokensFrom(node.parentElement ?? undefined, query) : [];
}

function declaredValues(node: Element, { props, stylesOf }: TokenQuery): string[] {
  const styles = stylesOf(node);
  return props
    .map((prop) => styles.findLast((style) => style.getPropertyValue(prop))?.getPropertyValue(prop))
    .filter((value) => value !== undefined);
}

function tokenNames(values: string[]): string[] {
  const names = values.flatMap((value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)]);
  return [...new Set(names.map((match) => match[1]))];
}

/**
 * The token's path in the theme object its variable mirrors, for variables
 * that start with one of `prefixes`: with "--ds-",
 * "--ds-color-text-primary" -> "color.text.primary". "" for other tokens.
 */
export function tokenPath(token: string, prefixes: string[]): string {
  const prefix = prefixes.find((candidate) => token.startsWith(candidate));
  return prefix ? token.slice(prefix.length).replaceAll("-", ".") : "";
}

/** ":root, .light" -> "light"; ".dark" -> "dark"; ":root" -> "default". */
export function scopeName(selector: string): string {
  const name = /([\w-]+)["'\]]*\s*$/.exec(selector)?.[1] ?? selector;
  return name === "root" ? "default" : name;
}

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
export const hasTokens = (computedStyle: CSSStyleDeclaration): boolean =>
  Array.from(computedStyle).some((prop) => prop.startsWith("--"));
