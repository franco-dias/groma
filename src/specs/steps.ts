/**
 * Changing a number by steps: an arrow key press, or one pixel of a drag.
 * A step is 1, or 10 with Shift, or 0.1 with Alt for most values. A length
 * in rem steps by 0.25, 1 and 0.0625 (a pixel of a 16px root), and a number
 * that CSS keeps between 0 and 1, like opacity, by 0.01, 0.1 and 0.001 and
 * never leaves that range.
 */

/** The modifier keys held while stepping a value. */
export type StepModifiers = { shiftKey: boolean; altKey: boolean };

/** What a step is measured in: pixels (and plain numbers), rem, or a fraction between 0 and 1. */
export type StepKind = "pixels" | "rem" | "fraction";

/** The size of a step without a modifier, with Shift and with Alt. */
const STEP_SIZES: Record<StepKind, [normal: number, shift: number, alt: number]> = {
  pixels: [1, 10, 0.1],
  rem: [0.25, 1, 0.0625],
  fraction: [0.01, 0.1, 0.001],
};

/** Properties whose plain number CSS keeps between 0 and 1. */
const FRACTION_PROPS = new Set([
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "flood-opacity",
  "stop-opacity",
  "shape-image-threshold",
]);

const PLAIN_NUMBER = /^-?\d*\.?\d+$/;
const REM_NUMBER = /^-?\d*\.?\d+rem/i;

/** What steps the text of a property's value is in. */
export function stepKindOf(prop: string, text: string): StepKind {
  const value = text.trim();
  if (FRACTION_PROPS.has(prop) && PLAIN_NUMBER.test(value)) return "fraction";
  return REM_NUMBER.test(value) ? "rem" : "pixels";
}

/** How much one arrow-key press, or one pixel of a drag, changes a value of that kind. */
export function stepFor({ shiftKey, altKey }: StepModifiers, kind: StepKind): number {
  const [normal, shift, alt] = STEP_SIZES[kind];
  if (shiftKey) return shift;
  return altKey ? alt : normal;
}

const LEADING_NUMBER = /^(-?\d*\.?\d+)(.*)/;

/** A value that is one number with an optional unit ("12px", "1.5rem", "400", "2fr"), not a list or a function. */
const ONE_NUMBER = /^-?\d*\.?\d+(?:[a-z]+|%)?$/i;

/** True when dragging could change the text: it is one number with an optional unit. */
export const isOneNumber = (text: string): boolean => ONE_NUMBER.test(text.trim());

const decimalsOf = (number: number): number => (String(number).split(".")[1] ?? "").length;

const keepInRange = (number: number, kind: StepKind): number =>
  kind === "fraction" ? Math.min(1, Math.max(0, number)) : number;

/**
 * A value whose leading number moved `distance` steps of `step`: ("12px", 3,
 * 0.1) -> "12.3px". Computed from the text it is given, so a drag that
 * always starts from the value it began with does not drift. Undefined when
 * the text does not start with a number.
 */
export function scrubValue(
  text: string,
  { distance, step, kind = "pixels" }: { distance: number; step: number; kind?: StepKind },
): string | undefined {
  const number = LEADING_NUMBER.exec(text);
  if (!number) return undefined;
  const start = parseFloat(number[1]);
  const decimals = Math.max(decimalsOf(step), decimalsOf(start));
  // Number() drops the zeros toFixed adds: 12 stays "12", not "12.0".
  const moved = Number((start + distance * step).toFixed(decimals));
  return String(keepInRange(moved, kind)) + number[2];
}

/** A value whose leading number went one step up or down: "12px" -> "13px". */
export function nudgeValue(
  text: string,
  { direction, step, kind }: { direction: 1 | -1; step: number; kind?: StepKind },
): string | undefined {
  return scrubValue(text, { distance: direction, step, kind });
}
