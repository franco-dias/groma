/** How the Specs tab writes lengths, on screen and on the clipboard. */
import type { CopyFormat } from "../config";
import type { Unit } from "../options";

/** How lengths are shown: the unit the user picked and the page's root font size, for rem. */
export type LengthDisplay = { unit: Unit; rootFontSize: number };

/** How lengths are copied: the display, and the project's format ("css" or "sx"). */
export type LengthCopy = LengthDisplay & { format: CopyFormat };

export type SpacingName = "padding" | "margin";

/** Padding or margin, with its four sides in pixels: top, right, bottom, left. */
export type Spacing = { name: SpacingName; sides: number[] };

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
export function shownLength(value: string, { unit, rootFontSize }: LengthDisplay): string {
  return value.replace(/(-?\d*\.?\d+)px/g, (_, pixels: string) =>
    unit === "px" ? pixels : `${Math.round((Number(pixels) / rootFontSize) * 1000) / 1000}rem`,
  );
}

/**
 * What a click on a length copies. CSS keeps the unit (`24px`, `1.5rem`);
 * the "sx" format copies a bare number for pixels.
 */
export function copiedLength(value: string, { unit, rootFontSize, format }: LengthCopy): string {
  if (unit === "rem") return shownLength(value, { unit: "rem", rootFontSize });
  return format === "sx" ? shownLength(value, { unit: "px", rootFontSize }) : value;
}

/**
 * What a click on "padding" or "margin" copies, for sides given in pixels:
 * a CSS declaration (`padding: 12px 16px`), or the "sx" keys (`py: 12, px: 16`).
 */
export function copiedSpacing({ name, sides }: Spacing, copy: LengthCopy): string {
  if (copy.format === "sx" && copy.unit === "px") return sxSpacing(name, sides);
  const lengths = sides.map((side) => copiedLength(`${side}px`, { ...copy, format: "css" }));
  return `${name}: ${compactSides(lengths)}`;
}

/** Padding or margin as style objects take it: `p: 24`, `py: 12, px: 16`, or one key per side. */
export function sxSpacing(name: SpacingName, sides: number[]): string {
  const [top, right, bottom, left] = sides;
  const key = name[0];
  if (top === right && top === bottom && top === left) return `${key}: ${top}`;
  if (top === bottom && right === left) return `${key}y: ${top}, ${key}x: ${right}`;
  return `${key}t: ${top}, ${key}r: ${right}, ${key}b: ${bottom}, ${key}l: ${left}`;
}

/** The modifier keys held while stepping a value. */
type StepModifiers = { shiftKey: boolean; altKey: boolean };

/**
 * How much one arrow-key press changes a value: 1, or 10 with Shift, or 0.1
 * with Alt.
 */
export function stepFor({ shiftKey, altKey }: StepModifiers): number {
  if (shiftKey) return 10;
  return altKey ? 0.1 : 1;
}

const LEADING_NUMBER = /^(-?\d*\.?\d+)(.*)/;

/**
 * A value whose leading number went one step up or down: "12px" -> "13px".
 * Undefined when the text does not start with a number. A step of 0.1, or a
 * number that already has decimals, keeps one decimal.
 */
export function nudgeValue(
  text: string,
  { direction, step }: { direction: 1 | -1; step: number },
): string | undefined {
  const number = LEADING_NUMBER.exec(text);
  if (!number) return undefined;
  const decimals = step === 0.1 || number[1].includes(".") ? 1 : 0;
  return (parseFloat(number[1]) + direction * step).toFixed(decimals) + number[2];
}
