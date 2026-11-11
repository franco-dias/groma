/**
 * Marks that follow elements on the page: the pinned element's outline with
 * its name tag, the outline of a layer hovered in the panel, and the
 * artboard grid.
 */
import { findBoard } from "./board";
import { h, placeOver, scaleOf, visibleBox } from "./dom";
import { elementName, sizeText } from "./element-name";
import { options } from "./options";
import { pageDocument, pageViewport, rectOf } from "./page";
import { mountOnPage } from "./root";
import { findPinnedElement, onSelection } from "./selection";

/** Below this distance from the top of the window (or the frame), the tag moves inside the outline. */
const TAG_HEIGHT_PX = 18;

let pinnedOutline: HTMLElement | undefined;
let pinTag: HTMLElement | undefined;
let hoverOutline: HTMLElement | undefined;
let grid: HTMLElement | undefined;
let outlined: Element | undefined;
let tickFrame = 0;

/**
 * The grid covers the visible part of the pinned element's artboard and
 * scales with it. Its lines start at the board's corner, also when the page
 * has scrolled that corner out of view.
 */
function placeGrid(pinned: Element): void {
  grid ??= mountOnPage(h("div", "grid"));
  const board = findBoard(pinned) ?? pageDocument().body;
  const rect = rectOf(board);
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

function followOutlined(): void {
  if (!outlined || !pinnedOutline) return;
  const rect = rectOf(outlined);
  placeOver(pinnedOutline, rect);
  pinTag?.classList.toggle("is-inside", rect.top - (pageViewport()?.top ?? 0) < TAG_HEIGHT_PX);
  // The page may replace the pinned element (a re-render, another page).
  pinnedOutline.style.visibility = outlined.isConnected ? "" : "hidden";
}

/** Keeps the outline and the grid on their targets while the page scrolls or zooms. */
function tick(): void {
  const pinned = findPinnedElement();
  const showGrid = options.gridStep > 0 && pinned !== undefined;
  followOutlined();
  if (showGrid && pinned) placeGrid(pinned);
  if (grid) grid.style.display = showGrid ? "block" : "none";
  tickFrame = outlined || showGrid ? requestAnimationFrame(tick) : 0;
}

function startTicking(): void {
  if (!tickFrame) tickFrame = requestAnimationFrame(tick);
}

/** Outlines `element` as the pinned element, unless the user switched outlines off. */
export function highlight(element: Element): void {
  if (!options.highlightPinned) return;
  if (!pinnedOutline) {
    pinnedOutline = mountOnPage(h("div", "outline outline-pinned"));
    pinTag = pinnedOutline.appendChild(h("div", "pin-tag"));
  }
  pinTag?.replaceChildren(h("b", "", elementName(element)), sizeText(element));
  pinnedOutline.style.display = "block";
  outlined = element;
  startTicking();
}

function hidePinnedOutline(): void {
  if (pinnedOutline) pinnedOutline.style.display = "none";
  outlined = undefined;
}

/** Brings the outline and the grid in line with the selection and the options. */
export function syncOutlines(): void {
  const pinned = findPinnedElement();
  if (pinned && options.highlightPinned) {
    highlight(pinned);
    return;
  }
  hidePinnedOutline();
  startTicking();
}

/** A dashed outline for a layer the pointer is over in the panel or a menu. */
export function showHoverOutline(element: Element): void {
  hoverOutline ??= mountOnPage(h("div", "outline outline-hover"));
  placeOver(hoverOutline, rectOf(element));
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
