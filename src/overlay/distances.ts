/** Red lines with the distance between the pinned element and the hovered one. */
import type { Scale } from "../dom";
import { addBox, addLabel } from "./layer";

/** A label fits inside a line at least this long, in screen pixels. */
const ROOM_FOR_LABEL = { x: 32, y: 22 };

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

/** Where a line crosses: the middle of the shared range, else the middle of the first one. */
function crossing(lo1: number, hi1: number, lo2: number, hi2: number): number {
  const lo = Math.max(lo1, lo2);
  const hi = Math.min(hi1, hi2);
  return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2;
}

type Span = [from: number, to: number, axis: "x" | "y"];

const distanceText = (pixels: number): string => String(Math.round(pixels * 10) / 10);

/**
 * Draws the gaps between `a` and `b`, or the four insets when one contains
 * the other. Labels are in CSS pixels: `scale` undoes the artboard zoom.
 */
export function drawDistances(a: DOMRect, b: DOMRect, scale: Scale): void {
  const y = crossing(a.top, a.bottom, b.top, b.bottom);
  const x = crossing(a.left, a.right, b.left, b.right);
  const insets: Span[] = [
    [Math.min(a.left, b.left), Math.max(a.left, b.left), "x"],
    [Math.min(a.right, b.right), Math.max(a.right, b.right), "x"],
    [Math.min(a.top, b.top), Math.max(a.top, b.top), "y"],
    [Math.min(a.bottom, b.bottom), Math.max(a.bottom, b.bottom), "y"],
  ];
  const gaps: Span[] = [
    [a.right, b.left, "x"],
    [b.right, a.left, "x"],
    [a.bottom, b.top, "y"],
    [b.bottom, a.top, "y"],
  ];

  const shortLabels = { x: 0, y: 0 };
  (contains(a, b) || contains(b, a) ? insets : gaps).forEach(([from, to, axis]) => {
    const length = to - from;
    if (length < 0.5) return;
    const middle = from + length / 2;
    const fits = length >= ROOM_FOR_LABEL[axis];
    const transform = fits ? "translate(-50%, -50%)" : BESIDE[axis][shortLabels[axis]++ % 2];
    if (axis === "x") {
      addBox({ left: from, top: y, width: length, height: 1 }, "measure is-x");
      addLabel(distanceText(length / scale.x), middle, y, transform);
    } else {
      addBox({ left: x, top: from, width: 1, height: length }, "measure is-y");
      addLabel(distanceText(length / scale.y), x, middle, transform);
    }
  });
}
