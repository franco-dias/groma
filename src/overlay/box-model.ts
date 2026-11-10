/**
 * The box-model overlay: margin (orange), border (red), padding (green),
 * content (blue), children (purple) and flex gaps (pink).
 */
import { type Sides, sidesOf } from "../box-sides";
import { type Box, scaleOf } from "../dom";
import { rectOf } from "../page";
import { isOwn } from "../root";
import { addBox, type BoxKind } from "./layer";

/**
 * Draws the four strips between `outer` and the rectangle inset by
 * `thickness`, and returns that inner rectangle.
 */
function drawRing(outer: Box, thickness: Sides, kind: BoxKind): Box {
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

export function drawBoxModel(el: Element, rect: Box, cs: CSSStyleDeclaration): void {
  const scale = scaleOf(el, rect);
  const onScreen = (sides: Sides): Sides => ({
    top: sides.top * scale.y,
    right: sides.right * scale.x,
    bottom: sides.bottom * scale.y,
    left: sides.left * scale.x,
  });
  const margin = onScreen(sidesOf(cs, "margin"));
  const marginBox = {
    left: rect.left - margin.left,
    top: rect.top - margin.top,
    width: rect.width + margin.left + margin.right,
    height: rect.height + margin.top + margin.bottom,
  };
  drawRing(marginBox, margin, "margin");
  const paddingBox = drawRing(rect, onScreen(sidesOf(cs, "border")), "border");
  addBox(drawRing(paddingBox, onScreen(sidesOf(cs, "padding")), "padding"), "content-box");
}

/** Outlines the visible children and fills the gaps between flex items. */
export function drawChildrenAndGaps(el: Element, rect: Box, cs: CSSStyleDeclaration): void {
  const rects = Array.from(el.children)
    .filter((child) => {
      if (isOwn(child)) return false;
      const childStyle = getComputedStyle(child);
      return childStyle.display !== "none" && childStyle.visibility !== "hidden";
    })
    .map((child) => rectOf(child));
  rects.forEach((childRect) => addBox(childRect, "child"));

  if (!cs.display.includes("flex")) return;
  const isRow = cs.flexDirection.startsWith("row");
  rects.sort((a, b) => (isRow ? a.left - b.left : a.top - b.top));
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i];
    const b = rects[i + 1];
    addBox(
      isRow
        ? { left: a.right, top: rect.top, width: b.left - a.right, height: rect.height }
        : { left: rect.left, top: a.bottom, width: rect.width, height: b.top - a.bottom },
      "gap",
    );
  }
}
