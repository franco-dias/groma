/**
 * Which of the page's design tokens to offer under a field in the Specs tab:
 * the ones that fit the property (colours for a colour, lengths for a size),
 * those that hold what the field holds first, then those whose name contains
 * what the user has typed.
 */

/** What kind of token a property takes. */
export type Fit = "color" | "length" | "shadow" | "time" | "easing" | "transition";

const COLOR_PROPS = new Set(["color", "background-color", "border-color", "fill", "stroke"]);
const LENGTH_PROPS = new Set([
  "width",
  "height",
  "gap",
  "row-gap",
  "column-gap",
  "border-radius",
  "padding",
  "margin",
  "font-size",
  "line-height",
  "letter-spacing",
  "stroke-width",
]);
const SHADOW_PROPS = new Set(["box-shadow", "text-shadow"]);
const TIME_PROPS = new Set(["transition-duration", "transition-delay"]);
const LENGTH_SIDES = /^(padding|margin)-(top|right|bottom|left)$/;

/**
 * The kind of token a property takes: colours for `color`, lengths for a gap
 * or a side of the box, shadows for a shadow, times for a duration or a
 * delay, timing functions, whole transitions; none for the rest.
 */
export function findFit(prop: string): Fit | undefined {
  if (COLOR_PROPS.has(prop)) return "color";
  if (SHADOW_PROPS.has(prop)) return "shadow";
  if (TIME_PROPS.has(prop)) return "time";
  if (prop === "transition-timing-function") return "easing";
  if (prop === "transition") return "transition";
  return LENGTH_PROPS.has(prop) || LENGTH_SIDES.test(prop) ? "length" : undefined;
}

/** A number with a length unit, zero, or a math function: what a token holds when it is a length. */
export const isLengthValue = (value: string): boolean =>
  /^-?(\d+\.?\d*|\.\d+)(px|rem|em|ex|ch|vw|vh|vmin|vmax|svh|dvh|lvh|pt|pc|cm|mm|in|cqw|cqh)$/i.test(value) ||
  /^-?0$/.test(value) ||
  /^(calc|min|max|clamp)\(/i.test(value);

/** The page's root font size, and the unit a bare number is read in. */
export type PixelReading = { rootFontSize: number; bareUnit?: "px" | "rem" };

/** A length in pixels, for the units that can be told from the page's root font size; undefined for the rest. */
export function lengthInPixels(
  text: string,
  { rootFontSize, bareUnit = "px" }: PixelReading,
): number | undefined {
  const parts = /^(-?\d*\.?\d+)(px|rem)?$/i.exec(text.trim());
  if (!parts) return undefined;
  const unit = (parts[2] ?? bareUnit).toLowerCase();
  return parseFloat(parts[1]) * (unit === "rem" ? rootFontSize : 1);
}

export type TokenChoice = { name: string; value: string };

/** How many tokens the list shows. */
export const MAX_SUGGESTIONS = 8;

/** What to list: the text typed, which values the field holds, and how many to show. */
export type TokenRanking = { typed: string; holds: (value: string) => boolean; limit?: number };

// The order the browser lists variables in is not one to rely on: shortest name first.
const byName = (first: TokenChoice, second: TokenChoice): number =>
  first.name.length - second.name.length || first.name.localeCompare(second.name);

/**
 * The tokens to list. `holds` says whether a token's value is what the field
 * holds. Those come first; then the ones whose name contains `typed`, which
 * is "" until the user has changed the field (the text it opened with is not
 * a search). Each group is ordered by length of name, then alphabetically.
 * `typed` may start with the dashes or not: `--sp` and `space`
 * both find `--space-4`.
 */
export function rankTokens(
  tokens: TokenChoice[],
  { typed, holds, limit = MAX_SUGGESTIONS }: TokenRanking,
): TokenChoice[] {
  const wanted = typed.trim().toLowerCase();
  const equal = tokens.filter((token) => holds(token.value)).toSorted(byName);
  const named = wanted
    ? tokens
        .filter((token) => !equal.includes(token) && token.name.toLowerCase().includes(wanted))
        .toSorted(byName)
    : [];
  return [...equal, ...named].slice(0, limit);
}
