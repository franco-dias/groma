/**
 * Inspect mode: hold Alt, or lock it on from the launcher.
 *
 *   hover   the hovered element's box model and a name chip, or, when an
 *           element is pinned, the distances from it to the hovered one
 *   click   pin the hovered element
 */
import { scaleOf } from "../dom";
import { isOwn } from "../root";
import { pin, pinnedElement } from "../selection";
import { drawBoxModel, drawChildrenAndGaps } from "./box-model";
import { drawDistances } from "./distances";
import { addBox, clearBoxes } from "./layer";
import { hideTooltip, showTooltip } from "./tooltip";

let altHeld = false;
let locked = false;
let hovered: Element | null = null;

export const isInspecting = (): boolean => altHeld || locked;

function clearHover(): void {
  clearBoxes();
  hideTooltip();
  hovered = null;
}

/** Shows or hides inspect mode after `altHeld` or `locked` changed. */
function update(): void {
  document.body.style.cursor = isInspecting() ? "crosshair" : "";
  if (!isInspecting()) clearHover();
}

/** Keeps inspect mode on without holding Alt. */
export function setInspectLock(on: boolean): void {
  locked = on;
  update();
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
  const pinned = pinnedElement();
  if (pinned && pinned !== target && pinned.isConnected) {
    // Measuring: only the target's outline and the distances. The box model
    // would bury the lines.
    const pinnedRect = pinned.getBoundingClientRect();
    addBox(rect, "target");
    drawDistances(pinnedRect, rect, scaleOf(pinned, pinnedRect));
  } else {
    const cs = getComputedStyle(target);
    drawBoxModel(target, rect, cs);
    drawChildrenAndGaps(target, rect, cs);
  }
  showTooltip(target, rect);
}

export function startHover(): void {
  const setAlt = (held: boolean) => {
    altHeld = held;
    update();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Alt") setAlt(true);
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Alt") setAlt(false);
  });
  // The Alt keyup never arrives when the window loses focus first.
  window.addEventListener("blur", () => setAlt(false));

  document.addEventListener(
    "mousemove",
    (e) => {
      if (isInspecting()) inspect(e.target);
    },
    true,
  );
  document.addEventListener("mouseleave", () => {
    if (isInspecting()) clearHover();
  });

  // A click pins. The whole press is kept from the page, not only the click.
  for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "click"] as const) {
    document.addEventListener(
      type,
      (e) => {
        if (!isInspecting() || isOwn(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        if (type === "click" && e.target instanceof Element) pin(e.target);
      },
      true,
    );
  }
}
