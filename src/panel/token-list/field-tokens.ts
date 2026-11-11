/** Which of the page's tokens fit a field, and which of them hold what the field holds. */
import { config } from "../../config";
import { customProperties, type CustomProperty, isColor, sameColor } from "../../specs/colors";
import { type Fit, isLengthValue, lengthInPixels } from "../../specs/suggest";

/** Two lengths in pixels closer than this are the same length. */
const SAME_LENGTH_TOLERANCE_PX = 0.01;

/**
 * The variables the element can see that are of the right kind for `fit`
 * (and of the page's token prefixes, when it set some).
 */
export function findFieldTokens(computedStyle: CSSStyleDeclaration, fit: Fit): CustomProperty[] {
  const prefixes = config.tokenPrefixes;
  const hasPrefix = (name: string): boolean => prefixes.some((prefix) => name.startsWith(prefix));
  return customProperties(computedStyle).filter(
    ({ name, value }) =>
      (!prefixes.length || hasPrefix(name)) && (fit === "color" ? isColor(value) : isLengthValue(value)),
  );
}

/** What a field's text means for a length: the page's root font size, and what a bare number is. */
export type LengthReading = { rootFontSize: number; bareUnit: "px" | "rem" };

/** Whether a token's value is what the text says: the same colour, or the same length. */
export function makeHolds(fit: Fit, reading: LengthReading): (text: string) => (value: string) => boolean {
  return (text) => (value) => {
    if (fit === "color") return sameColor(text, value);
    const asTyped = lengthInPixels(text, reading);
    const asToken = lengthInPixels(value, { rootFontSize: reading.rootFontSize });
    const isSameLength =
      asTyped !== undefined &&
      asToken !== undefined &&
      Math.abs(asTyped - asToken) < SAME_LENGTH_TOLERANCE_PX;
    return text.trim() === value || isSameLength;
  };
}
