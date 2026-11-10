/** Reads the page's stylesheets: which declarations apply to an element. */
import { pageDocument } from "./page";

/** A style rule of any document; `instanceof CSSStyleRule` is false for a frame's rules. */
const isStyleRule = (rule: CSSRule): rule is CSSStyleRule => "selectorText" in rule && "style" in rule;

/** Visits every style rule of the page, in source order. */
export function forEachPageRule(visit: (rule: CSSStyleRule) => void): void {
  const walk = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      if ("cssRules" in rule) walk(rule.cssRules as CSSRuleList);
      if (isStyleRule(rule)) visit(rule);
    }
  };
  for (const sheet of pageDocument().styleSheets) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Cross-origin stylesheet: its rules cannot be read.
    }
  }
}

/**
 * The declarations that apply to an element, weakest first: matching rules
 * in source order, then its inline style.
 */
function appliedStyles(el: Element): CSSStyleDeclaration[] {
  const styles: CSSStyleDeclaration[] = [];
  forEachPageRule((rule) => {
    try {
      if (el.matches(rule.selectorText)) styles.push(rule.style);
    } catch {
      // A selector this browser cannot match (vendor pseudo-elements).
    }
  });
  styles.push((el as HTMLElement).style);
  return styles;
}

export type StyleLookup = (el: Element) => CSSStyleDeclaration[];

/** `appliedStyles` with a cache, for one render that asks about the same elements often. */
export function createStyleLookup(): StyleLookup {
  const cache = new Map<Element, CSSStyleDeclaration[]>();
  return (el) => {
    let styles = cache.get(el);
    if (!styles) cache.set(el, (styles = appliedStyles(el)));
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
