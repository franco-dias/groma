/**
 * Shadows and filters read apart, for the Effects block of the Specs tab: one
 * shadow per entry with its offsets, blur, spread and color, one filter per
 * function with its argument. Works on computed values and on token values
 * alike, whatever the order of a shadow's parts (the browser puts the color
 * first when it computes one).
 */
import { splitTopLevel } from "./declarations";

export type Shadow = {
  inset: boolean;
  x: string;
  y: string;
  blur: string;
  /** Absent for a text shadow, which has none. */
  spread?: string;
  /** Empty when the shadow names no color. */
  color: string;
  /** The shadow as CSS, in the order x y blur spread color, with inset first. */
  text: string;
};

export type FilterFunction = { name: string; argument: string; text: string };

// Not a time: `150ms` is no length, or a transition would read as a shadow.
const LENGTH = /^[+-]?(\d+\.?\d*|\.\d+)(?!ms$|s$)[a-z%]*$/i;
const LENGTH_FUNCTION = /^(calc|min|max|clamp)\(/i;
const MAX_LENGTHS = 4;

const isLength = (token: string): boolean => LENGTH.test(token) || LENGTH_FUNCTION.test(token);

type ShadowParts = { lengths: string[]; colors: string[]; insets: string[] };

function sortTokens(tokens: string[]): ShadowParts {
  return {
    lengths: tokens.filter(isLength),
    insets: tokens.filter((token) => token === "inset"),
    colors: tokens.filter((token) => token !== "inset" && !isLength(token)),
  };
}

function toShadow({ lengths, colors, insets }: ShadowParts): Shadow | undefined {
  const isValid =
    lengths.length >= 2 && lengths.length <= MAX_LENGTHS && colors.length <= 1 && insets.length <= 1;
  if (!isValid) return undefined;
  const [x, y, blur = "0px", spread] = lengths;
  const color = colors[0] ?? "";
  const parts = [insets[0], x, y, blur, spread, color].filter(Boolean);
  return { inset: insets.length === 1, x, y, blur, spread, color, text: parts.join(" ") };
}

/** The shadows of a `box-shadow` or `text-shadow` value; none unless every one of them is a shadow. */
export function parseShadows(value: string): Shadow[] {
  const shadows = splitTopLevel(value, ",").map((entry) => toShadow(sortTokens(splitTopLevel(entry, " "))));
  return shadows.every((shadow) => shadow !== undefined) ? shadows : [];
}

/** The functions of a `filter` or `backdrop-filter` value, in order; none for `none`. */
export function parseFilters(value: string): FilterFunction[] {
  return splitTopLevel(value, " ").flatMap((text) => {
    const open = text.indexOf("(");
    if (open < 1 || !text.endsWith(")")) return [];
    return [{ name: text.slice(0, open), argument: text.slice(open + 1, -1), text }];
  });
}

/** A value that is shadows, each with its color: what a shadow token holds. A lone length or color is not one. */
export function isShadowValue(value: string): boolean {
  const shadows = parseShadows(value);
  return shadows.length > 0 && shadows.every(({ color }) => color !== "");
}
