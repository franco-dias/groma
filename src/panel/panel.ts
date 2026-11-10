/**
 * The side panel: docked to the right edge, with a tab bar, a collapse
 * button and a resize handle. It appears when an element is pinned.
 */
import { h } from "../dom";
import { elementName } from "../element-name";
import { mount, setRootVariable } from "../root";
import { onSelection, unpin } from "../selection";
import { changesTab } from "./changes-tab";
import { cssTab } from "./css-tab";
import { layersTab } from "./layers-tab";
import { loadLayout, saveLayout, setTab } from "./layout";
import template from "./panel.html?raw";
import { specsTab } from "./specs-tab";
import { part, type Tab } from "./tab";

const TABS: Tab[] = [specsTab, cssTab, layersTab, changesTab];
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;

let panel: HTMLElement | null = null;

/** Tells the rest of the inspector how much of the right edge the panel covers. */
function reportDock(): void {
  const visible = panel !== null && panel.style.display !== "none";
  setRootVariable("--ins-dock", `${visible ? panel!.offsetWidth : 0}px`);
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
  part(el, ".collapse").addEventListener("click", () => setCollapsed(el, true));
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
