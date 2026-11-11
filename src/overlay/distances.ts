/** Red lines with the distance between the pinned element and the hovered one. */
import type { Scale } from "../dom";
import { addBox, addLabel } from "./layer";

/** A label fits inside a line at least this long, in screen pixels. */
const ROOM_FOR_LABEL_PX = { x: 32, y: 22 };

/** A line shorter than this is not drawn. */
const MIN_LENGTH_PX = 0.5;

/**
 * Where a label goes when its line is too short to hold it: beside the line,
 * and on opposite sides for two neighbouring short lines.
 */
const BESIDE = {
  x: ["translate(-50%, -150%)", "translate(-50%, 50%)"],
  y: ["translate(8px, -50%)", "translate(calc(-100% - 8px), -50%)"],
};

const contains = (outer: DOMRect, inner: DOMRect): boolean =>
  outer.left <= inner.left &&
  outer.right >= inner.right &&
  outer.top <= inner.top &&
  outer.bottom >= inner.bottom;

type Range = [from: number, to: number];

/** Where a line crosses: the middle of the shared range, else the middle of the first one. */
function crossing([from1, to1]: Range, [from2, to2]: Range): number {
  const from = Math.max(from1, from2);
  const to = Math.min(to1, to2);
  return from < to ? (from + to) / 2 : (from1 + to1) / 2;
}

type Span = [from: number, to: number, axis: "x" | "y"];

const distanceText = (pixels: number): string => String(Math.round(pixels * 10) / 10);

/** The four insets of `inner` in `outer` (or either way round). */
function insetSpans(first: DOMRect, second: DOMRect): Span[] {
  return [
    [Math.min(first.left, second.left), Math.max(first.left, second.left), "x"],
    [Math.min(first.right, second.right), Math.max(first.right, second.right), "x"],
    [Math.min(first.top, second.top), Math.max(first.top, second.top), "y"],
    [Math.min(first.bottom, second.bottom), Math.max(first.bottom, second.bottom), "y"],
  ];
}

function gapSpans(first: DOMRect, second: DOMRect): Span[] {
  return [
    [first.right, second.left, "x"],
    [second.right, first.left, "x"],
    [first.bottom, second.top, "y"],
    [second.bottom, first.top, "y"],
  ];
}

/** What every line of one measurement shares. */
type Measurement = {
  /** Where the lines cross the other axis. */
  x: number;
  y: number;
  scale: Scale;
  /** How many labels of each axis have been put beside a short line so far. */
  shortLabels: { x: number; y: number };
};

function labelTransform(
  { axis, length }: { axis: "x" | "y"; length: number },
  shortLabels: Measurement["shortLabels"],
): string {
  if (length >= ROOM_FOR_LABEL_PX[axis]) return "translate(-50%, -50%)";
  return BESIDE[axis][shortLabels[axis]++ % 2];
}

function drawSpan([from, to, axis]: Span, measurement: Measurement): void {
  const length = to - from;
  if (length < MIN_LENGTH_PX) return;
  const middle = from + length / 2;
  const transform = labelTransform({ axis, length }, measurement.shortLabels);
  const { x, y, scale } = measurement;
  if (axis === "x") {
    addBox({ left: from, top: y, width: length, height: 1 }, "measure is-x");
    addLabel(distanceText(length / scale.x), { left: middle, top: y, transform });
    return;
  }
  addBox({ left: x, top: from, width: 1, height: length }, "measure is-y");
  addLabel(distanceText(length / scale.y), { left: x, top: middle, transform });
}

/** The two rectangles to measure between, and the artboard zoom that labels undo. */
export type Distances = { pinned: DOMRect; hovered: DOMRect; scale: Scale };

/**
 * Draws the gaps between the pinned and the hovered element, or the four
 * insets when one contains the other. Labels are in CSS pixels: `scale`
 * undoes the artboard zoom.
 */
export function drawDistances({ pinned, hovered, scale }: Distances): void {
  const measurement = {
    y: crossing([pinned.top, pinned.bottom], [hovered.top, hovered.bottom]),
    x: crossing([pinned.left, pinned.right], [hovered.left, hovered.right]),
    scale,
    shortLabels: { x: 0, y: 0 },
  };
  const isNested = contains(pinned, hovered) || contains(hovered, pinned);
  const spans = isNested ? insetSpans(pinned, hovered) : gapSpans(pinned, hovered);
  spans.forEach((span) => drawSpan(span, measurement));
}
