/**
 * The side panel: docked to the right edge, with tabs, a collapse button and
 * a resize handle. It appears when an element is pinned.
 */
import { h } from "../dom";
import { mount } from "../root";
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

let panel: HTMLElement | null = null;

function setCollapsed(el: HTMLElement, collapsed: boolean): void {
  el.classList.toggle("is-collapsed", collapsed);
  part(el, ".collapse").textContent = collapsed ? "«" : "»";
}

/** Dragging the panel's left edge changes its width. */
function resizeByDragging(el: HTMLElement): void {
  part(el, ".resize").addEventListener("mousedown", (down) => {
    down.preventDefault();
    const startWidth = el.offsetWidth;
    const move = (e: MouseEvent) => {
      const width = startWidth + down.clientX - e.clientX;
      el.style.width = `${Math.max(MIN_WIDTH, Math.min(window.innerWidth - 40, width))}px`;
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
  part(el, ".header").addEventListener("click", (e) => {
    const tab = (e.target as Element).closest<HTMLElement>(".tab")?.dataset.tab;
    if (tab) setTab(el, tab);
  });
  part(el, ".close").addEventListener("click", unpin);
  part(el, ".collapse").addEventListener("click", () => {
    setCollapsed(el, !el.classList.contains("is-collapsed"));
  });
  resizeByDragging(el);

  TABS.forEach((tab) => tab.mount(el));
  return el;
}

export function startPanel(): void {
  onSelection((el, change) => {
    if (!el) {
      if (panel) panel.style.display = "none";
      return;
    }
    panel ??= createPanel();
    panel.style.display = "";
    if (change === "pinned") setCollapsed(panel, false);
    TABS.forEach((tab) => tab.render(el, change));
  });
}
