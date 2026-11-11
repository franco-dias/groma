/** The rules of the page that change an element in a state (`:hover`, `:focus`…), read from the stylesheets without triggering the state. */
import { forEachApplyingPageRule, matchesSelector } from "../../page-styles";
import { splitTopLevel } from "../../specs/declarations";
import { statesIn, withoutStates } from "../../specs/states";

/**
 * The states `selector` puts the element in, when the element matches what
 * is left of it without them: `.button:hover` and `.card:hover .button` both
 * are for a `.button` inside a `.card`.
 */
function statesFor(element: Element, selector: string): string[] {
  const states = statesIn(selector);
  const rest = withoutStates(selector).trim();
  return states.length && rest && matchesSelector(element, rest) ? states : [];
}

/** The declarations of each state of `element`, in source order. Only rules that apply now. */
export function findStateRules(element: Element): Map<string, CSSStyleDeclaration[]> {
  const rules = new Map<string, CSSStyleDeclaration[]>();
  forEachApplyingPageRule((rule) => {
    splitTopLevel(rule.selectorText, ",")
      .flatMap((selector) => statesFor(element, selector))
      .forEach((state) => rules.set(state, [...(rules.get(state) ?? []), rule.style]));
  });
  return rules;
}
