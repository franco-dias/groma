/** How the Specs tab writes lengths, on screen and on the clipboard. */
import type { Unit } from "../options";

/** CSS shorthand order: one value when all sides match, two for vertical/horizontal. */
export function compactSides([top, right, bottom, left]: string[]): string {
  if (top === right && top === bottom && top === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  return `${top} ${right} ${bottom} ${left}`;
}

/** Rewrites every pixel length in `value` in the chosen unit. */
export function inUnit(value: string, unit: Unit, rootFontSize: number): string {
  if (unit === "px") return value;
  return value.replace(
    /(-?\d*\.?\d+)px/g,
    (_, pixels: string) => `${Math.round((Number(pixels) / rootFontSize) * 1000) / 1000}rem`,
  );
}

/**
 * What a click on a spec copies. In px it is the form MUI's `sx` prop takes
 * when one theme spacing step is 1px: a bare number, or `py`/`px` keys for a
 * multi-value padding or margin. Anything else is copied as shown.
 */
export function sxValue(name: string, value: string, unit: Unit): string {
  const parts = value.split(" ");
  if (unit !== "px" || !parts.every((part) => /^-?[\d.]+px$/.test(part))) return value;
  const numbers = parts.map(parseFloat);
  if (numbers.length === 1) return String(numbers[0]);
  if (name !== "padding" && name !== "margin") return value;
  const keys = numbers.length === 2 ? ["y", "x"] : ["t", "r", "b", "l"];
  return numbers.map((number, i) => `${name[0]}${keys[i]}: ${number}`).join(", ");
}
