/** Colour helpers for the Specs tab. */

let probe: CanvasRenderingContext2D | undefined;
const normalized = new Map<string, string | undefined>();

function getColorProbe(): CanvasRenderingContext2D {
  if (probe) return probe;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("This browser cannot make a canvas to read colors with.");
  probe = context;
  return probe;
}

/** The colour as the canvas spells it, or undefined when `value` is not a colour. */
function readColor(value: string): string | undefined {
  const colorProbe = getColorProbe();
  // An invalid colour leaves fillStyle untouched, so two different
  // starting points give two different answers.
  colorProbe.fillStyle = "#000";
  colorProbe.fillStyle = value;
  const first = colorProbe.fillStyle;
  colorProbe.fillStyle = "#fff";
  colorProbe.fillStyle = value;
  return first === colorProbe.fillStyle ? first : undefined;
}

/**
 * One spelling per colour, so "#fff", "white" and "rgb(255, 255, 255)"
 * compare equal. Undefined for text that is not a colour.
 */
function normalizeColor(value: string): string | undefined {
  if (normalized.has(value)) return normalized.get(value);
  const result = readColor(value);
  normalized.set(value, result);
  return result;
}

/** True when `value` is a colour in any spelling. */
export const isColor = (value: string): boolean => normalizeColor(value) !== undefined;

/** True when two texts are the same colour, whatever their spelling. */
export const sameColor = (first: string, second: string): boolean => {
  const normalizedFirst = normalizeColor(first);
  return normalizedFirst !== undefined && normalizedFirst === normalizeColor(second);
};

export type CustomProperty = { name: string; value: string };

/** The CSS variables an element can see, with their values: the page's design tokens. */
export function customProperties(computedStyle: CSSStyleDeclaration): CustomProperty[] {
  return Array.from(computedStyle)
    .filter((prop) => prop.startsWith("--"))
    .map((name) => ({ name, value: computedStyle.getPropertyValue(name).trim() }));
}

const byNameLength = (first: string, second: string): number => first.length - second.length;

/** The CSS variables on an element whose value is `color`, shortest names first. */
export function tokensWithColor(computedStyle: CSSStyleDeclaration, color: string): string[] {
  const wanted = normalizeColor(color);
  return customProperties(computedStyle)
    .filter(({ value }) => normalizeColor(value) === wanted)
    .map(({ name }) => name)
    .toSorted(byNameLength);
}

/**
 * The CSS variables on an element that hold `value`: the same colour in any
 * spelling, or the same text for any other value. Shortest names first.
 * shortcut: lengths are compared as text, so "1rem" does not match a token
 * that says "16px"; convert units if users miss those matches.
 * shortcut: any token with the value matches, whatever it is for (a radius
 * token for a gap); match by the property's kind if the names mislead.
 */
export function tokensWithValue(computedStyle: CSSStyleDeclaration, value: string): string[] {
  if (normalizeColor(value)) return tokensWithColor(computedStyle, value);
  // "none", "auto" and zero are held by tokens that have nothing to do with the property.
  if (!/[1-9]/.test(value)) return [];
  return customProperties(computedStyle)
    .filter((token) => token.value === value.trim())
    .map(({ name }) => name)
    .toSorted(byNameLength);
}

/** True when a CSS value starts like a colour, to decide whether to show a swatch. */
export const isColorValue = (value: string): boolean =>
  /^(#|rgb|rgba|hsl|hsla|oklch|color\()/.test(value.trim());
