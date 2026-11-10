/** How the inspector names an element in its UI. */
import { type Box, layoutSize } from "./dom";
import { componentOf } from "./specs/component";

/**
 * The name a developer knows the element by: its component when it is the
 * root of one ("Card"), otherwise its tag.
 */
export function elementName(el: Element): string {
  const component = componentOf(el);
  return component && !component.inside ? component.name : el.localName;
}

/** "444 × 382": the element's size in its own CSS pixels. */
export function sizeText(el: Element, rect: Box = el.getBoundingClientRect()): string {
  const { width, height } = layoutSize(el, rect);
  return `${width} × ${height}`;
}

/**
 * The tag and the classes of an element as two spans, so the tag reads first:
 * `<span>div<span class="classes">.card</span></span>`.
 */
export function tagAndClasses(el: Element, className: string): HTMLElement {
  const name = document.createElement("span");
  name.className = className;
  name.textContent = el.localName;
  const first = el.classList[0];
  if (first) {
    const classes = name.appendChild(document.createElement("span"));
    classes.className = "classes";
    classes.textContent = "." + first;
  }
  return name;
}
