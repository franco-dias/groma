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
