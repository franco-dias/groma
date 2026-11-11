/** Which of the page's tokens fit a field: the right kind of value, and of the page's token prefixes. */
import { config } from "../../config";
import { customProperties, type CustomProperty, isColor } from "../../specs/colors";
import { isShadowValue } from "../../specs/effects";
import { isEasingValue, isTimeValue, isTransitionValue } from "../../specs/motion-values";
import { type Fit, isLengthValue } from "../../specs/suggest";

/** What counts as a token of each kind: its value is a colour, a length, shadows, a time… */
const IS_OF_KIND: Record<Fit, (value: string) => boolean> = {
  color: isColor,
  length: isLengthValue,
  shadow: isShadowValue,
  time: isTimeValue,
  easing: isEasingValue,
  transition: isTransitionValue,
};

/**
 * The variables the element can see that are of the right kind for `fit`
 * (and of the page's token prefixes, when it set some).
 */
export function findFieldTokens(computedStyle: CSSStyleDeclaration, fit: Fit): CustomProperty[] {
  const prefixes = config.tokenPrefixes;
  const hasPrefix = (name: string): boolean => prefixes.some((prefix) => name.startsWith(prefix));
  return customProperties(computedStyle).filter(
    ({ name, value }) => (!prefixes.length || hasPrefix(name)) && IS_OF_KIND[fit](value),
  );
}
