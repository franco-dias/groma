/**
 * Inspect mode: hold Alt, or lock it on from the launcher.
 *
 *   hover   the hovered element's box model and a name chip, or, when an
 *           element is pinned, the distances from it to the hovered one
 *   click   pin the hovered element
 */
import { isElement, onPage, onPageCapture, onPageView, onPageWindow, pageDocument, rectOf } from "../page";
import { isOwn } from "../root";
import { pin } from "../selection";
import { drawHovered } from "./draw-hovered";
import { clearBoxes } from "./layer";
import { hideTooltip, showTooltip } from "./tooltip";

let isAltHeld = false;
let isLocked = false;
let hovered: Element | undefined;
let hoveredRect = "";

export const isInspecting = (): boolean => isAltHeld || isLocked;

const rectKey = (rect: DOMRect): string => `${rect.left},${rect.top},${rect.width},${rect.height}`;

function clearHover(): void {
  clearBoxes();
  hideTooltip();
  hovered = undefined;
  hoveredRect = "";
}

/** Shows or hides inspect mode after `isAltHeld` or `isLocked` changed. */
function update(): void {
  const body = pageDocument().body;
  if (body) body.style.cursor = isInspecting() ? "crosshair" : "";
  if (!isInspecting()) clearHover();
}

/** Keeps inspect mode on without holding Alt. */
export function lockInspect(): void {
  isLocked = true;
  update();
}

export function unlockInspect(): void {
  isLocked = false;
  update();
}

function holdAlt(): void {
  isAltHeld = true;
  update();
}

function releaseAlt(): void {
  isAltHeld = false;
  update();
}

const isPageRoot = (element: Element): boolean =>
  element === element.ownerDocument.body || element === element.ownerDocument.documentElement;

function inspect(target: unknown): void {
  if (isOwn(target)) return;
  if (!isElement(target) || isPageRoot(target)) {
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
  drawHovered(target, rect);
  showTooltip(target, rect);
}

function watchAlt(): void {
  onPage("keydown", (event) => {
    if (event.key === "Alt") holdAlt();
  });
  onPage("keyup", (event) => {
    if (event.key === "Alt") releaseAlt();
  });
  // The Alt keyup never arrives when the window loses focus first.
  onPageWindow("blur", releaseAlt);
  // The canvas moved the page, or showed another one: what was drawn is stale.
  onPageView(() => {
    clearHover();
    update();
  });
}

function watchPointer(): void {
  onPageCapture("mousemove", (event) => {
    if (isInspecting()) inspect(event.target);
  });
  onPage("mouseleave", () => {
    if (isInspecting()) clearHover();
  });
}

/** A click pins. The whole press is kept from the page, not only the click. */
function watchPress(): void {
  for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "click"] as const) {
    onPageCapture(type, (event) => {
      if (!isInspecting() || isOwn(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (type === "click" && isElement(event.target)) pin(event.target);
    });
  }
}

export function startHover(): void {
  watchAlt();
  watchPointer();
  watchPress();
}
