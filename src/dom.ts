/** DOM helpers shared by every module. */

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
 * How much CSS transforms (a zoomed artboard) scale an element on screen.
 * Computed sizes ignore transforms; the on-screen rectangle does not.
 */
export function scaleOf(el: Element, rect: Box): Scale {
  // SVG elements have no offset size; treat them as unscaled.
  const { offsetWidth, offsetHeight } = el as HTMLElement;
  return {
    x: offsetWidth ? rect.width / offsetWidth : 1,
    y: offsetHeight ? rect.height / offsetHeight : 1,
  };
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
