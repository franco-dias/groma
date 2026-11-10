/**
 * Marks that follow elements on the page: the pinned element's outline with
 * its name tag, the outline of a layer hovered in the panel, and the
 * artboard grid.
 */
import { boardOf } from "./board";
import { h, placeOver, scaleOf, visibleBox } from "./dom";
import { elementName, sizeText } from "./element-name";
import { options } from "./options";
import { mount } from "./root";
import { onSelection, pinnedElement } from "./selection";

/** Below this distance from the top of the window, the tag moves inside the outline. */
const TAG_HEIGHT = 18;

let pinnedOutline: HTMLElement | null = null;
let pinTag: HTMLElement | null = null;
let hoverOutline: HTMLElement | null = null;
let grid: HTMLElement | null = null;
let outlined: Element | null = null;
let frame = 0;

/**
 * The grid covers the visible part of the pinned element's artboard and
 * scales with it. Its lines start at the board's corner, also when the page
 * has scrolled that corner out of view.
 */
function placeGrid(pinned: Element): void {
  grid ??= mount(h("div", "grid"));
  const board = boardOf(pinned) ?? document.body;
  const rect = board.getBoundingClientRect();
  const scale = scaleOf(board, rect);
  const visible = visibleBox(board, rect);
  placeOver(grid, visible);
  const origin = `${rect.left - visible.left}px ${rect.top - visible.top}px`;
  grid.style.setProperty("-webkit-mask-position", origin);
  grid.style.setProperty("mask-position", origin);
  grid.classList.toggle("is-8", options.gridStep === 8);
  const cell = `${options.gridStep * scale.x}px ${options.gridStep * scale.y}px`;
  grid.style.setProperty("-webkit-mask-size", cell);
  grid.style.setProperty("mask-size", cell);
}

/** Keeps the outline and the grid on their targets while the page scrolls or zooms. */
function tick(): void {
  const pinned = pinnedElement();
  const showGrid = options.gridStep > 0 && pinned !== null;
  if (outlined && pinnedOutline) {
    const rect = outlined.getBoundingClientRect();
    placeOver(pinnedOutline, rect);
    pinTag?.classList.toggle("is-inside", rect.top < TAG_HEIGHT);
    // The page may replace the pinned element (a re-render, another page).
    pinnedOutline.style.visibility = outlined.isConnected ? "" : "hidden";
  }
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
  if (!pinnedOutline) {
    pinnedOutline = mount(h("div", "outline outline-pinned"));
    pinTag = pinnedOutline.appendChild(h("div", "pin-tag"));
  }
  pinTag?.replaceChildren(h("b", "", elementName(el)), sizeText(el));
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
  hoverOutline ??= mount(h("div", "outline outline-hover"));
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
