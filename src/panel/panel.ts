/**
 * The side panel: docked to the right edge, with a tab bar, a » menu (the
 * Reference tab, "Push the page aside" and "Collapse panel") and a resize
 * handle. It appears when an element is pinned.
 *
 * It either pushes the page aside by its own width (the default) or floats
 * over the page; the user switches in the » menu and the choice is remembered.
 */
import { h } from "../dom";
import { elementName } from "../element-name";
import { options } from "../options";
import { restorePage, shiftPage } from "../page-shift";
import { mount, setRootVariable } from "../root";
import { onSelection, unpin } from "../selection";
import { changesTab } from "./changes-tab";
import { cssTab } from "./css-tab";
import { layersTab } from "./layers-tab";
import { loadLayout, saveLayout, setTab } from "./layout";
import template from "./panel.html?raw";
import { referenceTab } from "./reference-tab";
import { specsTab } from "./specs-tab";
import { part, type Tab } from "./tab";

const TABS: Tab[] = [specsTab, cssTab, layersTab, changesTab, referenceTab];
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;

let panel: HTMLElement | null = null;

/**
 * Tells the rest of the inspector how much of the right edge the panel takes,
 * and, in push mode, makes room for it in the page.
 */
function reportDock(): void {
  const visible = panel !== null && panel.style.display !== "none";
  const width = visible ? panel!.offsetWidth : 0;
  setRootVariable("--ins-dock", `${width}px`);
  if (options.panelMode === "push") shiftPage(width);
  else restorePage();
}

function setCollapsed(el: HTMLElement, collapsed: boolean): void {
  el.classList.toggle("is-collapsed", collapsed);
  reportDock();
}

/** Dragging the panel's left edge changes its width. */
function resizeByDragging(el: HTMLElement): void {
  part(el, ".resize").addEventListener("mousedown", (down) => {
    down.preventDefault();
    const startWidth = el.offsetWidth;
    const move = (e: MouseEvent) => {
      const width = startWidth + down.clientX - e.clientX;
      el.style.width = `${Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))}px`;
      reportDock();
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveLayout(el);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

/** The » button opens a small menu: the Reference tab, the push/float switch and "Collapse panel". */
function mountMoreMenu(el: HTMLElement): void {
  const button = part(el, ".more-button");
  const menu = part(el, ".more-menu");
  const setOpen = (open: boolean) => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  // Any other click in the panel, or Esc, closes the menu.
  el.addEventListener("click", () => setOpen(false));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  part(menu, '[data-tab="reference"]').addEventListener("click", () => setTab(el, "reference"));
  part(menu, ".collapse").addEventListener("click", () => setCollapsed(el, true));

  const push = part(menu, '[data-action="push"]');
  const showMode = () => push.setAttribute("aria-checked", String(options.panelMode === "push"));
  push.addEventListener("click", () => {
    options.panelMode = options.panelMode === "push" ? "float" : "push";
    showMode();
    saveLayout(el);
    reportDock();
  });
  showMode();
}

function createPanel(): HTMLElement {
  const el = mount(h("div", "panel"));
  el.innerHTML = template;
  loadLayout(el);

  // Keys typed in the panel must not trigger the page's own shortcuts.
  el.addEventListener("keydown", (e) => e.stopPropagation());
  part(el, ".tabs").addEventListener("click", (e) => {
    const tab = (e.target as Element).closest<HTMLElement>(".tab")?.dataset.tab;
    if (tab) setTab(el, tab);
  });
  part(el, ".close").addEventListener("click", unpin);
  mountMoreMenu(el);
  part(el, ".rail").addEventListener("click", () => setCollapsed(el, false));
  resizeByDragging(el);

  TABS.forEach((tab) => tab.mount(el));
  return el;
}

export function startPanel(): void {
  onSelection((el, change) => {
    if (!el) {
      if (panel) panel.style.display = "none";
      reportDock();
      return;
    }
    panel ??= createPanel();
    panel.style.display = "";
    part(panel, ".rail .name").textContent = `Inspect · ${elementName(el)}`;
    if (change === "pinned") setCollapsed(panel, false);
    TABS.forEach((tab) => tab.render(el, change));
    reportDock();
  });
}
