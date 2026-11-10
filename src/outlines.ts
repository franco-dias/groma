/**
 * Marks that follow elements on the page: the pinned element's outline, the
 * outline of a layer hovered in the panel, and the artboard grid.
 */
import { boardOf } from "./board";
import { h, placeOver, scaleOf } from "./dom";
import { options } from "./options";
import { mount } from "./root";
import { onSelection, pinnedElement } from "./selection";

let pinnedOutline: HTMLElement | null = null;
let hoverOutline: HTMLElement | null = null;
let grid: HTMLElement | null = null;
let outlined: Element | null = null;
let frame = 0;

/** The grid covers the pinned element's artboard and scales with it. */
function placeGrid(pinned: Element): void {
  grid ??= mount(h("div", "grid"));
  const board = boardOf(pinned) ?? document.body;
  const rect = board.getBoundingClientRect();
  const scale = scaleOf(board, rect);
  placeOver(grid, rect);
  grid.style.backgroundSize = `${options.gridStep * scale.x}px ${options.gridStep * scale.y}px`;
}

/** Keeps the outline and the grid on their targets while the page scrolls or zooms. */
function tick(): void {
  const pinned = pinnedElement();
  const showGrid = options.gridStep > 0 && pinned !== null;
  if (outlined && pinnedOutline) placeOver(pinnedOutline, outlined.getBoundingClientRect());
  if (showGrid) placeGrid(pinned);
  if (grid) grid.style.display = showGrid ? "block" : "none";
  frame = outlined || showGrid ? requestAnimationFrame(tick) : 0;
}

function startTicking(): void {
  if (!frame) frame = requestAnimationFrame(tick);
}

/** Outlines `el` as the pinned element, unless the user switched outlines off. */
export function highlight(el: Element): void {
  if (!options.highlightPinned) return;
  pinnedOutline ??= mount(h("div", "outline outline-pinned"));
  pinnedOutline.style.display = "block";
  outlined = el;
  startTicking();
}

/** Brings the outline and the grid in line with the selection and the options. */
export function syncOutlines(): void {
  const pinned = pinnedElement();
  if (pinned && options.highlightPinned) {
    highlight(pinned);
  } else {
    if (pinnedOutline) pinnedOutline.style.display = "none";
    outlined = null;
  }
  startTicking();
}

/** A dashed outline for a layer the pointer is over in the panel or a menu. */
export function showHoverOutline(el: Element): void {
  hoverOutline ??= mount(h("div", "outline outline-nav"));
  placeOver(hoverOutline, el.getBoundingClientRect());
  hoverOutline.style.display = "block";
}

export function hideHoverOutline(): void {
  if (hoverOutline) hoverOutline.style.display = "none";
}

export function startOutlines(): void {
  onSelection(() => {
    syncOutlines();
    hideHoverOutline();
  });
}
