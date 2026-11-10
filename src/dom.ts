/** DOM helpers shared by every module. */
import { pageZoom, rectOf } from "./page";

/** A rectangle in viewport pixels. A `DOMRect` is one. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Scale {
  x: number;
  y: number;
}

/** Creates an element with a class and, optionally, text. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Moves and sizes a fixed-position node so it covers `box`. */
export function placeOver(node: HTMLElement, box: Box): void {
  node.style.left = `${box.left}px`;
  node.style.top = `${box.top}px`;
  node.style.width = `${box.width}px`;
  node.style.height = `${box.height}px`;
}

/**
 * How much an element is scaled on screen: by CSS transforms (a zoomed
 * artboard) and by the canvas zoom. Computed sizes ignore both; the on-screen
 * rectangle from `rectOf` does not.
 */
export function scaleOf(el: Element, rect: Box): Scale {
  // SVG elements have no offset size; treat them as scaled by the canvas only.
  const { offsetWidth, offsetHeight } = el as HTMLElement;
  return {
    x: offsetWidth ? rect.width / offsetWidth : pageZoom(),
    y: offsetHeight ? rect.height / offsetHeight : pageZoom(),
  };
}

/**
 * The part of an element's rectangle the page actually shows: what is left
 * after every scrolling or clipping ancestor has cut it.
 */
export function visibleBox(el: Element, rect: Box): Box {
  let left = rect.left;
  let top = rect.top;
  let right = rect.left + rect.width;
  let bottom = rect.top + rect.height;
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const clip = rectOf(parent);
    left = Math.max(left, clip.left);
    top = Math.max(top, clip.top);
    right = Math.min(right, clip.right);
    bottom = Math.min(bottom, clip.bottom);
  }
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** The element's border-box size in its own CSS pixels, at any zoom. */
export function layoutSize(el: Element, rect: Box): { width: number; height: number } {
  const { offsetWidth, offsetHeight } = el as HTMLElement;
  const rounded = (value: number) => Math.round(value * 100) / 100;
  return {
    width: offsetWidth ?? rounded(rect.width),
    height: offsetHeight ?? rounded(rect.height),
  };
}

/** A short name for an element: "div#id.first-class.second-class". */
export function elementLabel(el: Element, maxClasses = 3): string {
  const classes = Array.from(el.classList)
    .slice(0, maxClasses)
    .map((name) => "." + name)
    .join("");
  return el.localName + (el.id ? "#" + el.id : "") + classes;
}
