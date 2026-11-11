/** The small menu that opens under a row of the Specs tab: a choice of values for one property. */
import { h } from "../../dom";
import { icon } from "../../icons";

export type MenuItem = {
  value: string;
  glyph: SVGSVGElement;
  /** Said after the value, muted: what it means, or the property it sets. */
  hint: string;
  checked: boolean;
  pick: () => void;
};

/** The menu to open under a row, and what to call it. */
export type RowMenu = { name: string; items: MenuItem[] };

/** The small menu open under a row of the tab, if any. One at a time. */
let openMenu: HTMLElement | undefined;

export const isMenuOpen = (): boolean => openMenu !== undefined;

export function closeMenu(): void {
  openMenu?.remove();
  openMenu = undefined;
}

function createMenuItem({ value, glyph, hint, checked, pick }: MenuItem): HTMLElement {
  const item = h("button", "more-item");
  item.setAttribute("role", "menuitemradio");
  item.setAttribute("aria-checked", String(checked));
  item.dataset.value = value;
  const check = icon("check", 12);
  check.classList.add("check");
  item.append(check, glyph, value, h("span", "hint", hint));
  item.addEventListener("click", pick);
  return item;
}

/** Opens a menu of choices under `row`; asked again for the same menu, closes it. */
export function toggleMenu(row: HTMLElement, { name, items }: RowMenu): void {
  const reopen = openMenu?.dataset.menu !== name;
  closeMenu();
  if (!reopen) return;
  const menu = h("div", "row-menu");
  menu.setAttribute("role", "menu");
  menu.dataset.menu = name;
  menu.append(...items.map(createMenuItem));
  openMenu = row.appendChild(menu);
}
