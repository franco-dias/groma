/**
 * Inspect mode: hold Alt, or lock it on from the launcher.
 *
 *   hover   the hovered element's box model and a name chip, or, when an
 *           element is pinned, the distances from it to the hovered one
 *   click   pin the hovered element
 *   double-click   while locked on, edit the text of an element that holds
 *           only text, right on the page (text-edit.ts)
 */
import { isElement, onPage, onPageCapture, onPageView, onPageWindow, pageDocument, rectOf } from "../page";
import { isOwn } from "../root";
import { pin } from "../selection";
import { drawHovered } from "./draw-hovered";
import { clearBoxes } from "./layer";
import { applyTextEdit, editTextInPlace, isInTextEdit, isTextEditing, watchTextEdit } from "./text-edit";
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
  applyTextEdit();
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
    if (isInspecting() && !isTextEditing()) inspect(event.target);
  });
  onPage("mouseleave", () => {
    if (isInspecting()) clearHover();
  });
}

const PRESS_TYPES = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick"] as const;

/** A double-click while locked edits the text of an element that holds only text. */
function editText(target: Element): void {
  clearHover();
  editTextInPlace(target);
}

function press(type: (typeof PRESS_TYPES)[number], event: MouseEvent): void {
  // A press inside the text being edited belongs to the text: it places the caret.
  if (!isInspecting() || isOwn(event.target) || isInTextEdit(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  if (!isElement(event.target)) return;
  if (type === "click") pin(event.target);
  if (type === "dblclick" && isLocked) editText(event.target);
}

/** A click pins. The whole press is kept from the page, not only the click. */
function watchPress(): void {
  for (const type of PRESS_TYPES) onPageCapture(type, (event) => press(type, event));
}

export function startHover(): void {
  watchAlt();
  watchPointer();
  watchPress();
  watchTextEdit();
}
