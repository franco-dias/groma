/** The chip that names the hovered element: name, size, position on its board. */
import { boardPosition } from "../board";
import { type Box, h } from "../dom";
import { elementName, sizeText } from "../element-name";
import { mount } from "../root";

/** Space between the chip and the element, and between the chip and the window edge. */
const GAP = 6;
const EDGE = 4;

let tooltip: HTMLElement | null = null;

/** Shows the chip above the element's top-left corner, or below when there is no room. */
export function showTooltip(el: Element, rect: Box): void {
  tooltip ??= mount(h("div", "tooltip"));
  const position = boardPosition(el)?.text ?? "";
  tooltip.replaceChildren(
    h("b", "", elementName(el)),
    h("span", "", sizeText(el)),
    h("span", "position", position),
  );
  tooltip.style.display = "flex";

  const above = rect.top - tooltip.offsetHeight - GAP;
  const top = above >= EDGE ? above : rect.top + rect.height + GAP;
  const maxLeft = window.innerWidth - tooltip.offsetWidth - EDGE;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(EDGE, Math.min(rect.left, maxLeft))}px`;
}

export function hideTooltip(): void {
  if (tooltip) tooltip.style.display = "none";
}
