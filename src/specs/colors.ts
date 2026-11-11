/** Colour helpers for the Specs tab. */

let probe: CanvasRenderingContext2D | null = null;
const normalized = new Map<string, string | null>();

/**
 * One spelling per colour, so "#fff", "white" and "rgb(255, 255, 255)"
 * compare equal. Returns null for text that is not a colour.
 */
function normalizeColor(value: string): string | null {
  let result = normalized.get(value);
  if (result === undefined) {
    probe ??= document.createElement("canvas").getContext("2d")!;
    // An invalid colour leaves fillStyle untouched, so two different
    // starting points give two different answers.
    probe.fillStyle = "#000";
    probe.fillStyle = value;
    const first = probe.fillStyle;
    probe.fillStyle = "#fff";
    probe.fillStyle = value;
    result = first === probe.fillStyle ? first : null;
    normalized.set(value, result);
  }
  return result;
}

/** The CSS variables on an element whose value is `color`, shortest names first. */
export function tokensWithColor(cs: CSSStyleDeclaration, color: string): string[] {
  const wanted = normalizeColor(color);
  return Array.from(cs)
    .filter((prop) => prop.startsWith("--"))
    .filter((prop) => normalizeColor(cs.getPropertyValue(prop).trim()) === wanted)
    .sort((a, b) => a.length - b.length);
}

/**
 * The CSS variables on an element that hold `value`: the same colour in any
 * spelling, or the same text for any other value. Shortest names first.
 * shortcut: lengths are compared as text, so "1rem" does not match a token
 * that says "16px"; convert units if users miss those matches.
 * shortcut: any token with the value matches, whatever it is for (a radius
 * token for a gap); match by the property's kind if the names mislead.
 */
export function tokensWithValue(cs: CSSStyleDeclaration, value: string): string[] {
  if (normalizeColor(value)) return tokensWithColor(cs, value);
  // "none", "auto" and zero are held by tokens that have nothing to do with the property.
  if (!/[1-9]/.test(value)) return [];
  return Array.from(cs)
    .filter((prop) => prop.startsWith("--") && cs.getPropertyValue(prop).trim() === value.trim())
    .sort((a, b) => a.length - b.length);
}

/** "rgb(27, 26, 23)" -> "#1B1A17". A translucent colour keeps its alpha as a percentage. */
export function formatColor(value: string): string {
  const parts = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(value);
  if (!parts) return value;
  const hex = parts
    .slice(1, 4)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const alpha = parts[4] === undefined ? "" : ` ${Math.round(Number(parts[4]) * 100)}%`;
  return "#" + hex + alpha;
}

/** True when a CSS value starts like a colour, to decide whether to show a swatch. */
export const isColorValue = (value: string): boolean =>
  /^(#|rgb|rgba|hsl|hsla|oklch|color\()/.test(value.trim());
