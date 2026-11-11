/**
 * Alt + right-click: a menu of every layer under the pointer, topmost first,
 * to reach an element that sits behind another one.
 */
import { h } from "../dom";
import { sizeText, tagAndClasses } from "../element-name";
import { hideHoverOutline, showHoverOutline } from "../outlines";
import { onPageCapture, type Point, toWindowPoint } from "../page";
import { isOwn, mount } from "../root";
import { pin } from "../selection";
import { isInspecting } from "./hover";

/** The menu opens this far below and right of the pointer. */
const OFFSET_PX = 8;

let menu: HTMLElement | undefined;

function closeMenu(): void {
  if (!menu) return;
  menu.remove();
  menu = undefined;
  hideHoverOutline();
}

function createItem(layer: Element): HTMLElement {
  const item = h("div", "menu-item");
  item.setAttribute("role", "menuitem");
  item.append(tagAndClasses(layer, "layer-name"), h("span", "size", sizeText(layer)));
  item.addEventListener("mouseenter", () => showHoverOutline(layer));
  item.addEventListener("click", () => {
    closeMenu();
    pin(layer);
  });
  return item;
}

/** Below and right of the pointer, pulled back inside the window when needed. */
function placeMenu(list: HTMLElement, pointer: Point): void {
  const left = Math.min(pointer.x + OFFSET_PX, window.innerWidth - list.offsetWidth - OFFSET_PX);
  const top = Math.min(pointer.y + OFFSET_PX, window.innerHeight - list.offsetHeight - OFFSET_PX);
  list.style.left = `${left}px`;
  list.style.top = `${top}px`;
}

/** `point` is the pointer in `page`, the document the right-click happened in. */
function openMenu(page: Document, point: Point): void {
  closeMenu();
  const layers = page
    .elementsFromPoint(point.x, point.y)
    .filter((layer) => !isOwn(layer) && layer !== page.body && layer !== page.documentElement);

  const list = (menu = mount(h("div", "menu")));
  list.setAttribute("role", "menu");
  const head = list.appendChild(h("div", "menu-head"));
  head.append(h("span", "", "Layers at pointer"), h("span", "count", String(layers.length)));
  layers.forEach((layer) => list.appendChild(createItem(layer)));
  placeMenu(list, toWindowPoint(point, page));
}

export function startLayerMenu(): void {
  onPageCapture("contextmenu", (event) => {
    if (!isInspecting() || isOwn(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    // Cast: a context menu opens on a node.
    const page = (event.target as Node).ownerDocument ?? document;
    openMenu(page, { x: event.clientX, y: event.clientY });
  });
  // A press anywhere else closes the menu.
  onPageCapture("mousedown", (event) => {
    if (menu && !event.composedPath().includes(menu)) closeMenu();
  });
}
