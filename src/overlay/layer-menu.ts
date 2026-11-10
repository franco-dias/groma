/**
 * Alt + right-click: a menu of every layer under the pointer, topmost first,
 * to reach an element that sits behind another one.
 */
import { h } from "../dom";
import { sizeText, tagAndClasses } from "../element-name";
import { hideHoverOutline, showHoverOutline } from "../outlines";
import { onPage, toWindowPoint } from "../page";
import { isOwn, mount } from "../root";
import { pin } from "../selection";
import { isInspecting } from "./hover";

/** The menu opens this far below and right of the pointer. */
const OFFSET = 8;

let menu: HTMLElement | null = null;

function closeMenu(): void {
  if (!menu) return;
  menu.remove();
  menu = null;
  hideHoverOutline();
}

/** `x` and `y` are the pointer in `page`, the document the right-click happened in. */
function openMenu(page: Document, x: number, y: number): void {
  closeMenu();
  const layers = page
    .elementsFromPoint(x, y)
    .filter((el) => !isOwn(el) && el !== page.body && el !== page.documentElement);
  const { x: pointerX, y: pointerY } = toWindowPoint(x, y, page);

  const list = (menu = mount(h("div", "menu")));
  list.setAttribute("role", "menu");
  const head = list.appendChild(h("div", "menu-head"));
  head.append(h("span", "", "Layers at pointer"), h("span", "count", String(layers.length)));
  for (const layer of layers) {
    const item = list.appendChild(h("div", "menu-item"));
    item.setAttribute("role", "menuitem");
    item.append(tagAndClasses(layer, "layer-name"), h("span", "size", sizeText(layer)));
    item.addEventListener("mouseenter", () => showHoverOutline(layer));
    item.addEventListener("click", () => {
      closeMenu();
      pin(layer);
    });
  }
  // Below and right of the pointer, pulled back inside the window when needed.
  const left = Math.min(pointerX + OFFSET, window.innerWidth - list.offsetWidth - OFFSET);
  const top = Math.min(pointerY + OFFSET, window.innerHeight - list.offsetHeight - OFFSET);
  list.style.left = `${left}px`;
  list.style.top = `${top}px`;
}

export function startLayerMenu(): void {
  onPage(
    "contextmenu",
    (e) => {
      if (!isInspecting() || isOwn(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu((e.target as Node).ownerDocument ?? document, e.clientX, e.clientY);
    },
    true,
  );
  // A press anywhere else closes the menu.
  onPage(
    "mousedown",
    (e) => {
      if (menu && !e.composedPath().includes(menu)) closeMenu();
    },
    true,
  );
}
