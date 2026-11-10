/**
 * Inspect mode: hold Alt.
 *
 *   Alt + hover   the hovered element's box model and a tooltip, or, when an
 *                 element is pinned, the distances from it to the hovered one
 *   Alt + click   pin the hovered element
 */
import { scaleOf } from "../dom";
import { isOwn } from "../root";
import { pin, pinnedElement } from "../selection";
import { drawBoxModel, drawChildrenAndGaps } from "./box-model";
import { drawDistances } from "./distances";
import { addBox, clearBoxes } from "./layer";
import { hideTooltip, moveTooltip, showTooltip, tooltipText } from "./tooltip";

let inspecting = false;
let hovered: Element | null = null;

export const isInspecting = (): boolean => inspecting;

function clearHover(): void {
  clearBoxes();
  hideTooltip();
  hovered = null;
}

function setInspecting(on: boolean): void {
  inspecting = on;
  document.body.style.cursor = on ? "crosshair" : "";
  if (!on) clearHover();
}

function inspect(target: EventTarget | null): void {
  if (target === hovered || isOwn(target)) return;
  if (
    !(target instanceof Element) ||
    target === document.body ||
    target === document.documentElement
  ) {
    clearHover();
    return;
  }
  clearBoxes();
  hovered = target;

  const rect = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  const pinned = pinnedElement();
  if (pinned && pinned !== target && pinned.isConnected) {
    // Measuring: only the target's outline and the distances. The box model
    // and the tooltip would bury the lines.
    const pinnedRect = pinned.getBoundingClientRect();
    addBox(rect, "target");
    drawDistances(pinnedRect, rect, scaleOf(pinned, pinnedRect));
    hideTooltip();
  } else {
    drawBoxModel(target, rect, cs);
    drawChildrenAndGaps(target, rect, cs);
    showTooltip(tooltipText(target, rect, cs));
  }
}

export function startHover(): void {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Alt") setInspecting(true);
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Alt") setInspecting(false);
  });
  // The Alt keyup never arrives when the window loses focus first.
  window.addEventListener("blur", () => setInspecting(false));

  document.addEventListener(
    "mousemove",
    (e) => {
      if (!inspecting) return;
      inspect(e.target);
      moveTooltip(e.clientX, e.clientY);
    },
    true,
  );
  document.addEventListener("mouseleave", () => {
    if (inspecting) clearHover();
  });

  // Alt+click pins. The whole press is kept from the page, not only the click.
  for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "click"] as const) {
    document.addEventListener(
      type,
      (e) => {
        if (!inspecting || isOwn(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        if (type === "click" && e.target instanceof Element) pin(e.target);
      },
      true,
    );
  }
}
