/** The text box that follows the pointer while hovering with Alt held. */
import { boardPosition } from "../board";
import { SIDES, sidesOf } from "../box-sides";
import { type Box, elementLabel, h, layoutSize } from "../dom";
import { mount } from "../root";

let tooltip: HTMLElement | null = null;

const line = (label: string, value: string): string => label.padEnd(18) + value;

function sidesLine(cs: CSSStyleDeclaration, property: "margin" | "padding" | "border"): string {
  const sides = sidesOf(cs, property);
  return SIDES.map((side) => `${side}: ${Math.round(sides[side])}`).join("    ");
}

/** Spacing, size, position and layout of an element, as aligned text. */
export function tooltipText(el: Element, rect: Box, cs: CSSStyleDeclaration): string {
  const lines = [elementLabel(el, 4), "─".repeat(40)];

  lines.push(line("margin", sidesLine(cs, "margin")));
  if (Object.values(sidesOf(cs, "border")).some((width) => Math.round(width))) {
    lines.push(line("border", sidesLine(cs, "border")));
  }
  lines.push(line("padding", sidesLine(cs, "padding")));
  const size = layoutSize(el, rect);
  lines.push(line("size", `${size.width} × ${size.height}`));
  const onBoard = boardPosition(el, rect);
  if (onBoard) lines.push(line("on board", onBoard.text));
  lines.push(line("display", cs.display));

  if (cs.display.includes("flex") || cs.display.includes("grid")) {
    lines.push("", "── as container ──────────────────────");
    lines.push(line("flex-direction", cs.flexDirection));
    lines.push(line("flex-wrap", cs.flexWrap));
    lines.push(line("justify-content", cs.justifyContent));
    lines.push(line("align-items", cs.alignItems));
    lines.push(line("align-content", cs.alignContent));
    if (cs.gap && cs.gap !== "normal") lines.push(line("gap", cs.gap));
  }

  const parentDisplay = el.parentElement ? getComputedStyle(el.parentElement).display : "";
  if (parentDisplay.includes("flex") || parentDisplay.includes("grid")) {
    lines.push("", "── as child ──────────────────────────");
    lines.push(line("flex", cs.flex));
    lines.push(line("flex-grow", cs.flexGrow));
    lines.push(line("flex-shrink", cs.flexShrink));
    lines.push(line("flex-basis", cs.flexBasis));
    lines.push(line("align-self", cs.alignSelf));
    if (cs.order && cs.order !== "0") lines.push(line("order", cs.order));
  }

  if (cs.position !== "static") {
    lines.push("", "── position ──────────────────────────");
    lines.push(line("position", cs.position));
    SIDES.forEach((side) => lines.push(line(side, cs.getPropertyValue(side))));
  }

  return lines.join("\n");
}

export function showTooltip(text: string): void {
  tooltip ??= mount(h("div", "tooltip"));
  tooltip.textContent = text;
  tooltip.style.display = "block";
}

export function hideTooltip(): void {
  if (tooltip) tooltip.style.display = "none";
}

/** Keeps the tooltip beside the pointer and inside the window. */
export function moveTooltip(pointerX: number, pointerY: number): void {
  if (!tooltip || tooltip.style.display === "none") return;
  let left = pointerX + 16;
  let top = pointerY + 16;
  if (left + tooltip.offsetWidth > window.innerWidth - 8) left = pointerX - tooltip.offsetWidth - 12;
  if (top + tooltip.offsetHeight > window.innerHeight - 8) top = pointerY - tooltip.offsetHeight - 12;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}
