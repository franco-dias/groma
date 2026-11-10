/**
 * Alt + right-click: a menu of every layer under the pointer, to reach an
 * element that sits behind another one.
 */
import { elementLabel, h } from "../dom";
import { hideHoverOutline, showHoverOutline } from "../outlines";
import { isOwn, mount } from "../root";
import { pin } from "../selection";
import { isInspecting } from "./hover";

let menu: HTMLElement | null = null;

function closeMenu(): void {
  if (!menu) return;
  menu.remove();
  menu = null;
  hideHoverOutline();
}

function openMenu(pointerX: number, pointerY: number): void {
  closeMenu();
  const list = (menu = mount(h("div", "menu")));
  document
    .elementsFromPoint(pointerX, pointerY)
    .filter((el) => !isOwn(el) && el !== document.body && el !== document.documentElement)
    .forEach((el) => {
      const row = list.appendChild(h("div", "", elementLabel(el)));
      row.addEventListener("mouseenter", () => showHoverOutline(el));
      row.addEventListener("click", () => {
        closeMenu();
        pin(el);
      });
    });
  list.style.left = `${Math.min(pointerX, window.innerWidth - list.offsetWidth - 8)}px`;
  list.style.top = `${Math.min(pointerY, window.innerHeight - list.offsetHeight - 8)}px`;
}

export function startLayerMenu(): void {
  document.addEventListener(
    "contextmenu",
    (e) => {
      if (!isInspecting() || isOwn(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY);
    },
    true,
  );
  // A press anywhere else closes the menu.
  document.addEventListener(
    "mousedown",
    (e) => {
      if (menu && !e.composedPath().includes(menu)) closeMenu();
    },
    true,
  );
}
