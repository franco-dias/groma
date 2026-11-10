/** How the Specs tab writes lengths, on screen and on the clipboard. */
import type { CopyFormat } from "../config";
import type { Unit } from "../options";

/** CSS shorthand order: one value when all sides match, two for vertical/horizontal. */
export function compactSides([top, right, bottom, left]: string[]): string {
  if (top === right && top === bottom && top === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  return `${top} ${right} ${bottom} ${left}`;
}

/**
 * Rewrites every pixel length in `value` the way the Specs tab shows it:
 * a bare number in px (one MUI spacing step is 1px), or rem.
 */
export function shownLength(value: string, unit: Unit, rootFontSize: number): string {
  return value.replace(/(-?\d*\.?\d+)px/g, (_, pixels: string) =>
    unit === "px" ? pixels : `${Math.round((Number(pixels) / rootFontSize) * 1000) / 1000}rem`,
  );
}

/**
 * What a click on a length copies. CSS keeps the unit (`24px`, `1.5rem`);
 * the "sx" format copies a bare number for pixels.
 */
export function copiedLength(
  value: string,
  unit: Unit,
  rootFontSize: number,
  format: CopyFormat,
): string {
  if (unit === "rem") return shownLength(value, "rem", rootFontSize);
  return format === "sx" ? shownLength(value, "px", rootFontSize) : value;
}

/**
 * What a click on "padding" or "margin" copies, for sides given in pixels:
 * a CSS declaration (`padding: 12px 16px`), or the "sx" keys (`py: 12, px: 16`).
 */
export function copiedSpacing(
  name: "padding" | "margin",
  sides: number[],
  unit: Unit,
  rootFontSize: number,
  format: CopyFormat,
): string {
  if (format === "sx" && unit === "px") return sxSpacing(name, sides);
  const lengths = sides.map((side) => copiedLength(`${side}px`, unit, rootFontSize, "css"));
  return `${name}: ${compactSides(lengths)}`;
}

/** Padding or margin as style objects take it: `p: 24`, `py: 12, px: 16`, or one key per side. */
export function sxSpacing(name: "padding" | "margin", sides: number[]): string {
  const [top, right, bottom, left] = sides;
  const key = name[0];
  if (top === right && top === bottom && top === left) return `${key}: ${top}`;
  if (top === bottom && right === left) return `${key}y: ${top}, ${key}x: ${right}`;
  return `${key}t: ${top}, ${key}r: ${right}, ${key}b: ${bottom}, ${key}l: ${left}`;
}
