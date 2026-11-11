/** Reads the page's stylesheets: which declarations apply to an element. */
import { pageDocument, pageWindow } from "./page";

/** A style rule of any document; `instanceof CSSStyleRule` is false for a frame's rules. */
const isStyleRule = (rule: CSSRule): rule is CSSStyleRule => "selectorText" in rule && "style" in rule;

/** A rule's media list, when it is a media rule. Cast: a frame's rules are not `instanceof` ours. */
function mediaListOf(rule: CSSRule): MediaList | undefined {
  if (!("media" in rule) || !rule.media || !("mediaText" in (rule.media as object))) return undefined;
  return rule.media as MediaList;
}

function mediaApplies(media: MediaList): boolean {
  return !media.mediaText || pageWindow().matchMedia(media.mediaText).matches;
}

const isConditionRule = (rule: CSSRule): rule is CSSConditionRule =>
  "conditionText" in rule && !("containerQuery" in rule) && !("containerName" in rule);

function readsAsApplying(rule: CSSRule): boolean {
  const media = mediaListOf(rule);
  if (media) return mediaApplies(media);
  return isConditionRule(rule) ? CSS.supports(String(rule.conditionText)) : true;
}

/**
 * Whether the browser applies the rules inside a conditional group now:
 * `@media` against the page's viewport, `@supports` against the browser.
 * Detected by property, since a frame's rules are not `instanceof` ours.
 * shortcut: `@container` is treated as applying, since its condition depends
 * on the size of an element, not of the page; evaluate it with the container
 * if a page shows the wrong value from a container query.
 */
function groupApplies(rule: CSSRule): boolean {
  try {
    return readsAsApplying(rule);
  } catch {
    // A condition this browser cannot read: keep the rules, as before.
    return true;
  }
}

/** What to do with each style rule, and which `@media`-like groups to look inside. */
type RuleWalk = { visit: (rule: CSSStyleRule) => void; entersGroup: (rule: CSSRule) => boolean };

/** Calls `visit` for each style rule inside `rules`, entering the groups `entersGroup` allows. */
function walkRules(rules: CSSRuleList, walk: RuleWalk): void {
  const visitRule = (rule: CSSRule): void => {
    if (!walk.entersGroup(rule)) return;
    // Cast: a rule with `cssRules` is a group of rules.
    if ("cssRules" in rule) walkRules(rule.cssRules as CSSRuleList, walk);
    if (isStyleRule(rule)) walk.visit(rule);
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

/** Calls `visit` for each style rule of the page in source order, entering the groups `entersGroup` allows. */
function walkPageRules(walk: RuleWalk): void {
  Array.from(pageDocument().styleSheets).forEach((sheet) => {
    const rules = readRules(sheet);
    if (rules) walkRules(rules, walk);
  });
}

/**
 * Visits every style rule of the page, in source order, whether or not the
 * browser applies it now. Token themes and modes read this way, because a
 * dark theme sits in a media query that does not apply now on purpose.
 */
export const forEachPageRule = (visit: (rule: CSSStyleRule) => void): void =>
  walkPageRules({ visit, entersGroup: () => true });

/**
 * Visits the style rules of the page that apply now, in source order: rules
 * inside an `@media` or `@supports` group that does not apply are skipped.
 * The question is then which declarations the element has now.
 */
export const forEachApplyingPageRule = (visit: (rule: CSSStyleRule) => void): void =>
  walkPageRules({ visit, entersGroup: groupApplies });

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
 * in source order, then its inline style. Rules in a media query or
 * `@supports` block that does not apply now are not among them.
 */
function appliedStyles(element: Element): CSSStyleDeclaration[] {
  const styles: CSSStyleDeclaration[] = [];
  forEachApplyingPageRule((rule) => {
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
