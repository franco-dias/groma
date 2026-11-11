/** Reads the page's stylesheets: which declarations apply to an element. */
import { pageDocument } from "./page";

/** A style rule of any document; `instanceof CSSStyleRule` is false for a frame's rules. */
const isStyleRule = (rule: CSSRule): rule is CSSStyleRule => "selectorText" in rule && "style" in rule;

/** Calls `visit` for each style rule inside `rules`, in source order, nested ones first. */
function walkRules(rules: CSSRuleList, visit: (rule: CSSStyleRule) => void): void {
  const visitRule = (rule: CSSRule): void => {
    // Cast: a rule with `cssRules` is a group of rules.
    if ("cssRules" in rule) walkRules(rule.cssRules as CSSRuleList, visit);
    if (isStyleRule(rule)) visit(rule);
  };
  Array.from(rules).forEach(visitRule);
}

/** Reads a sheet's rules; those of a cross-origin sheet cannot be read, and it has none to offer. */
function readRules(sheet: CSSStyleSheet): CSSRuleList | undefined {
  try {
    return sheet.cssRules;
  } catch {
    return undefined;
  }
}

/** Visits every style rule of the page, in source order. */
export function forEachPageRule(visit: (rule: CSSStyleRule) => void): void {
  Array.from(pageDocument().styleSheets).forEach((sheet) => {
    const rules = readRules(sheet);
    if (rules) walkRules(rules, visit);
  });
}

function matchesSelector(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    // A selector this browser cannot match (vendor pseudo-elements).
    return false;
  }
}

/**
 * The declarations that apply to an element, weakest first: matching rules
 * in source order, then its inline style.
 */
function appliedStyles(element: Element): CSSStyleDeclaration[] {
  const styles: CSSStyleDeclaration[] = [];
  forEachPageRule((rule) => {
    if (matchesSelector(element, rule.selectorText)) styles.push(rule.style);
  });
  // Cast: every element of the page has a `style` (SVG too); the type only says so for HTML.
  styles.push((element as HTMLElement).style);
  return styles;
}

export type StyleLookup = (element: Element) => CSSStyleDeclaration[];

/** `appliedStyles` with a cache, for one render that asks about the same elements often. */
export function createStyleLookup(): StyleLookup {
  const cache = new Map<Element, CSSStyleDeclaration[]>();
  return (element) => {
    const cached = cache.get(element);
    if (cached) return cached;
    const styles = appliedStyles(element);
    cache.set(element, styles);
    return styles;
  };
}

/**
 * The value an element declares for a property, or "" when it declares none.
 * shortcut: the last declaration wins and selector specificity is ignored;
 * upgrade if a page shows a value from a rule that a stronger rule overrides.
 */
export function declaredValue(styles: CSSStyleDeclaration[], prop: string): string {
  const style = styles.findLast((candidate) => candidate.getPropertyValue(prop));
  return style ? style.getPropertyValue(prop).trim() : "";
}
