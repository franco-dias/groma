/** How the inspector names an element in its UI. */
import { type Box, layoutSize } from "./dom";
import { findComponent } from "./specs/component";

/**
 * The name a developer knows the element by: its component when it is the
 * root of one ("Card"), otherwise its tag.
 */
export function elementName(element: Element): string {
  const component = findComponent(element);
  return component && !component.inside ? component.name : element.localName;
}

/** "444 × 382": the element's size in its own CSS pixels. */
export function sizeText(element: Element, rect: Box = element.getBoundingClientRect()): string {
  const { width, height } = layoutSize(element, rect);
  return `${width} × ${height}`;
}

/**
 * The tag and the classes of an element as two spans, so the tag reads first:
 * `<span>div<span class="classes">.card</span></span>`.
 */
export function tagAndClasses(element: Element, className: string): HTMLElement {
  const name = document.createElement("span");
  name.className = className;
  name.textContent = element.localName;
  const first = element.classList[0];
  if (first) {
    const classes = name.appendChild(document.createElement("span"));
    classes.className = "classes";
    classes.textContent = "." + first;
  }
  return name;
}
