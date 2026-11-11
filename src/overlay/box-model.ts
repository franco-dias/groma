/**
 * The box-model overlay: margin (orange), border (red), padding (green),
 * content (blue), children (purple) and flex gaps (pink).
 */
import { type Sides, sidesOf } from "../box-sides";
import { type Box, scaleOf } from "../dom";
import { rectOf } from "../page";
import { isOwn } from "../root";
import { addBox, type BoxKind } from "./layer";

/** The outer rectangle of a ring and how thick its four strips are. */
type Ring = { outer: Box; thickness: Sides };

/**
 * Draws the four strips between `outer` and the rectangle inset by
 * `thickness`, and returns that inner rectangle.
 */
function drawRing({ outer, thickness }: Ring, kind: BoxKind): Box {
  const { top, right, bottom, left } = thickness;
  const innerHeight = outer.height - top - bottom;
  const rightEdge = outer.left + outer.width - right;
  const bottomEdge = outer.top + outer.height - bottom;
  addBox({ left: outer.left, top: outer.top, width: outer.width, height: top }, kind);
  addBox({ left: outer.left, top: bottomEdge, width: outer.width, height: bottom }, kind);
  addBox({ left: outer.left, top: outer.top + top, width: left, height: innerHeight }, kind);
  addBox({ left: rightEdge, top: outer.top + top, width: right, height: innerHeight }, kind);
  return {
    left: outer.left + left,
    top: outer.top + top,
    width: outer.width - left - right,
    height: innerHeight,
  };
}

/** An element, where it is on screen, and its computed style. */
export type HoveredElement = { element: Element; rect: Box; computedStyle: CSSStyleDeclaration };

function onScreenSides(sides: Sides, scale: { x: number; y: number }): Sides {
  return {
    top: sides.top * scale.y,
    right: sides.right * scale.x,
    bottom: sides.bottom * scale.y,
    left: sides.left * scale.x,
  };
}

export function drawBoxModel({ element, rect, computedStyle }: HoveredElement): void {
  const scale = scaleOf(element, rect);
  const sidesOnScreen = (property: "margin" | "border" | "padding"): Sides =>
    onScreenSides(sidesOf(computedStyle, property), scale);
  const margin = sidesOnScreen("margin");
  const marginBox = {
    left: rect.left - margin.left,
    top: rect.top - margin.top,
    width: rect.width + margin.left + margin.right,
    height: rect.height + margin.top + margin.bottom,
  };
  drawRing({ outer: marginBox, thickness: margin }, "margin");
  const paddingBox = drawRing({ outer: rect, thickness: sidesOnScreen("border") }, "border");
  const contentBox = drawRing({ outer: paddingBox, thickness: sidesOnScreen("padding") }, "padding");
  addBox(contentBox, "content-box");
}

function isVisibleChild(child: Element): boolean {
  if (isOwn(child)) return false;
  const childStyle = getComputedStyle(child);
  return childStyle.display !== "none" && childStyle.visibility !== "hidden";
}

/** The box that fills the space between two neighbouring items of a flex container. */
function gapBetween([first, second]: [DOMRect, DOMRect], container: { rect: Box; isRow: boolean }): Box {
  const { rect, isRow } = container;
  return isRow
    ? { left: first.right, top: rect.top, width: second.left - first.right, height: rect.height }
    : { left: rect.left, top: first.bottom, width: rect.width, height: second.top - first.bottom };
}

/** Outlines the visible children and fills the gaps between flex items. */
export function drawChildrenAndGaps({ element, rect, computedStyle }: HoveredElement): void {
  const rects = Array.from(element.children).filter(isVisibleChild).map(rectOf);
  rects.forEach((childRect) => addBox(childRect, "child"));

  if (!computedStyle.display.includes("flex")) return;
  const isRow = computedStyle.flexDirection.startsWith("row");
  const ordered = rects.toSorted((first, second) =>
    isRow ? first.left - second.left : first.top - second.top,
  );
  ordered.slice(0, -1).forEach((item, index) => {
    addBox(gapBetween([item, ordered[index + 1]], { rect, isRow }), "gap");
  });
}
