/**
 * Inspect mode: hold Alt, or lock it on from the launcher.
 *
 *   hover   the hovered element's box model and a name chip, or, when an
 *           element is pinned, the distances from it to the hovered one
 *   click   pin the hovered element
 */
import { scaleOf } from "../dom";
import { isElement, onPage, onPageView, onPageWindow, pageDocument, rectOf } from "../page";
import { isOwn } from "../root";
import { pin, pinnedElement } from "../selection";
import { drawBoxModel, drawChildrenAndGaps } from "./box-model";
import { drawDistances } from "./distances";
import { addBox, clearBoxes } from "./layer";
import { hideTooltip, showTooltip } from "./tooltip";

let altHeld = false;
let locked = false;
let hovered: Element | null = null;
let hoveredRect = "";

export const isInspecting = (): boolean => altHeld || locked;

const rectKey = (rect: DOMRect): string => `${rect.left},${rect.top},${rect.width},${rect.height}`;

function clearHover(): void {
  clearBoxes();
  hideTooltip();
  hovered = null;
  hoveredRect = "";
}

/** Shows or hides inspect mode after `altHeld` or `locked` changed. */
function update(): void {
  const body = pageDocument().body;
  if (body) body.style.cursor = isInspecting() ? "crosshair" : "";
  if (!isInspecting()) clearHover();
}

/** Keeps inspect mode on without holding Alt. */
export function setInspectLock(on: boolean): void {
  locked = on;
  update();
}

function inspect(target: EventTarget | null): void {
  if (isOwn(target)) return;
  if (
    !isElement(target) ||
    target === target.ownerDocument.body ||
    target === target.ownerDocument.documentElement
  ) {
    clearHover();
    return;
  }
  const rect = rectOf(target);
  // The same element in the same place needs no redraw. If the page moved it
  // (the panel pushing the layout, a scroll), draw again.
  if (target === hovered && rectKey(rect) === hoveredRect) return;
  clearBoxes();
  hovered = target;
  hoveredRect = rectKey(rect);

  const pinned = pinnedElement();
  if (pinned && pinned !== target && pinned.isConnected) {
    // Measuring: only the target's outline and the distances. The box model
    // would bury the lines.
    const pinnedRect = rectOf(pinned);
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
  onPage("keydown", (e) => {
    if (e.key === "Alt") setAlt(true);
  });
  onPage("keyup", (e) => {
    if (e.key === "Alt") setAlt(false);
  });
  // The Alt keyup never arrives when the window loses focus first.
  onPageWindow("blur", () => setAlt(false));
  // The canvas moved the page, or showed another one: what was drawn is stale.
  onPageView(() => {
    clearHover();
    update();
  });

  onPage(
    "mousemove",
    (e) => {
      if (isInspecting()) inspect(e.target);
    },
    true,
  );
  onPage("mouseleave", () => {
    if (isInspecting()) clearHover();
  });

  // A click pins. The whole press is kept from the page, not only the click.
  for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "click"] as const) {
    onPage(
      type,
      (e) => {
        if (!isInspecting() || isOwn(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        if (type === "click" && isElement(e.target)) pin(e.target);
      },
      true,
    );
  }
}
