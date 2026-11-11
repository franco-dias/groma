/** What is drawn on the page for the hovered element: its box model, or its distances from the pinned one. */
import { scaleOf } from "../dom";
import { rectOf } from "../page";
import { findPinnedElement } from "../selection";
import { drawBoxModel, drawChildrenAndGaps } from "./box-model";
import { drawDistances } from "./distances";
import { addBox } from "./layer";

export function drawHovered(target: Element, rect: DOMRect): void {
  const pinned = findPinnedElement();
  if (pinned && pinned !== target && pinned.isConnected) {
    // Measuring: only the target's outline and the distances. The box model
    // would bury the lines.
    const pinnedRect = rectOf(pinned);
    addBox(rect, "target");
    drawDistances({ pinned: pinnedRect, hovered: rect, scale: scaleOf(pinned, pinnedRect) });
    return;
  }
  const hoveredElement = { element: target, rect, computedStyle: getComputedStyle(target) };
  drawBoxModel(hoveredElement);
  drawChildrenAndGaps(hoveredElement);
}
