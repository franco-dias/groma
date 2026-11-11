/** DOM helpers shared by every module. */
import { pageZoom, rectOf } from "./page";

/** A rectangle in viewport pixels. A `DOMRect` is one. */
export type Box = { left: number; top: number; width: number; height: number };

export type Scale = { x: number; y: number };

/**
 * Creates an element with a class and, optionally, text.
 *
 * The inspector builds its markup with this in about two hundred places, with
 * all three arguments; an options object here would only bury every call.
 */
// oxlint-disable-next-line max-params -- the project's DOM builder, called as h(tag, class, text) everywhere
export function h<TTag extends keyof HTMLElementTagNameMap>(
  tag: TTag,
  className = "",
  text?: string,
): HTMLElementTagNameMap[TTag] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
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
export function scaleOf(element: Element, rect: Box): Scale {
  // Cast: only HTML elements have an offset size; SVG ones are scaled by the canvas only.
  const { offsetWidth, offsetHeight } = element as HTMLElement;
  return {
    x: offsetWidth ? rect.width / offsetWidth : pageZoom(),
    y: offsetHeight ? rect.height / offsetHeight : pageZoom(),
  };
}

type Edges = { left: number; top: number; right: number; bottom: number };

function clipTo(edges: Edges, ancestor: Element): Edges {
  const clip = rectOf(ancestor);
  return {
    left: Math.max(edges.left, clip.left),
    top: Math.max(edges.top, clip.top),
    right: Math.min(edges.right, clip.right),
    bottom: Math.min(edges.bottom, clip.bottom),
  };
}

function isClipping(ancestor: Element): boolean {
  const { overflowX, overflowY } = getComputedStyle(ancestor);
  return overflowX !== "visible" || overflowY !== "visible";
}

function ancestorsOf(element: Element): Element[] {
  const ancestors: Element[] = [];
  for (let parent = element.parentElement; parent; parent = parent.parentElement) ancestors.push(parent);
  return ancestors;
}

/**
 * The part of an element's rectangle the page actually shows: what is left
 * after every scrolling or clipping ancestor has cut it.
 */
export function visibleBox(element: Element, rect: Box): Box {
  const whole = {
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
  };
  const { left, top, right, bottom } = ancestorsOf(element).filter(isClipping).reduce(clipTo, whole);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export const roundToHundredth = (value: number): number => Math.round(value * 100) / 100;

/** The element's border-box size in its own CSS pixels, at any zoom. */
export function layoutSize(element: Element, rect: Box): { width: number; height: number } {
  // Cast: only HTML elements have an offset size; for SVG ones the rectangle stands in.
  const { offsetWidth, offsetHeight } = element as HTMLElement;
  return {
    width: offsetWidth ?? roundToHundredth(rect.width),
    height: offsetHeight ?? roundToHundredth(rect.height),
  };
}

/** A short name for an element: "div#id.first-class.second-class". */
export function elementLabel(element: Element, maxClasses = 3): string {
  const classes = Array.from(element.classList)
    .slice(0, maxClasses)
    .map((name) => "." + name)
    .join("");
  return element.localName + (element.id ? "#" + element.id : "") + classes;
}
