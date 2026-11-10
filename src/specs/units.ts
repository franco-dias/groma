/** How the Specs tab writes lengths, on screen and on the clipboard. */
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
 * Padding or margin as MUI's `sx` prop takes it when one theme spacing step
 * is 1px: `p: 24`, `py: 12, px: 16`, or one key per side.
 */
export function sxSpacing(name: "padding" | "margin", sides: number[]): string {
  const [top, right, bottom, left] = sides;
  const key = name[0];
  if (top === right && top === bottom && top === left) return `${key}: ${top}`;
  if (top === bottom && right === left) return `${key}y: ${top}, ${key}x: ${right}`;
  return `${key}t: ${top}, ${key}r: ${right}, ${key}b: ${bottom}, ${key}l: ${left}`;
}
