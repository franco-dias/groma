/** The chip that names the hovered element: name, size, position on its board. */
import { findBoardPosition } from "../board";
import { type Box, h } from "../dom";
import { elementName, sizeText } from "../element-name";
import { mount } from "../root";

/** Space between the chip and the element, and between the chip and the window edge. */
const GAP_PX = 6;
const EDGE_PX = 4;

let tooltip: HTMLElement | undefined;

/** Shows the chip above the element's top-left corner, or below when there is no room. */
export function showTooltip(element: Element, rect: Box): void {
  tooltip ??= mount(h("div", "tooltip"));
  const position = findBoardPosition(element)?.text ?? "";
  tooltip.replaceChildren(
    h("b", "", elementName(element)),
    h("span", "", sizeText(element)),
    h("span", "position", position),
  );
  tooltip.style.display = "flex";

  const above = rect.top - tooltip.offsetHeight - GAP_PX;
  const top = above >= EDGE_PX ? above : rect.top + rect.height + GAP_PX;
  const maxLeft = window.innerWidth - tooltip.offsetWidth - EDGE_PX;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(EDGE_PX, Math.min(rect.left, maxLeft))}px`;
}

export function hideTooltip(): void {
  if (tooltip) tooltip.style.display = "none";
}
