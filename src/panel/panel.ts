/**
 * The side panel: docked to the right edge, with a tab bar, a » menu (the
 * Reference tab, "Push the page aside", "Show on a canvas" and "Collapse
 * panel") and a resize handle.
 *
 * It slides in when an element is pinned and out when it closes. Alt + Shift + G opens it with nothing
 * pinned, to reach the menu and the reference, and closes it again.
 *
 * It either pushes the page aside by its own width (the default) or floats
 * over the page; the user switches in the » menu and the choice is remembered.
 */
import { isCanvasOn, setCanvas } from "../canvas/canvas";
import { h } from "../dom";
import { elementName } from "../element-name";
import { options } from "../options";
import { onPage, onPageView } from "../page";
import { restorePage, shiftPage } from "../page-shift";
import { ALT_KEY } from "../platform";
import { mount, setRootVariable } from "../root";
import { onSelection, type SelectionChange, unpin } from "../selection";
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
 * On a closed panel. The stylesheet slides the panel in and out around this
 * class; everything else treats the panel as closed from the moment it is set.
 */
const CLOSED = "is-closed";
const isOpen = (): boolean => panel !== null && !panel.classList.contains(CLOSED);

/**
 * Tells the rest of the inspector how much of the right edge the panel takes,
 * and, in push mode, makes room for it in the page.
 */
function reportDock(): void {
  const width = isOpen() ? panel!.offsetWidth : 0;
  setRootVariable("--ins-dock", `${width}px`);
  cancelAnimationFrame(pushFrame);
  pushPage();
}

/** How much of the panel is on screen right now: less than its width while it slides. */
function widthOnScreen(): number {
  if (!panel) return 0;
  const style = getComputedStyle(panel);
  if (style.display === "none") return 0;
  return Math.max(0, panel.offsetWidth - new DOMMatrix(style.transform).m41);
}

let pushFrame = 0;

/**
 * Push mode: the page gives way by as much of the panel as is on screen, so it
 * moves with the panel while the panel slides, frame by frame, and never ahead
 * of it or behind.
 */
function pushPage(): void {
  // On the canvas the page is in a frame beside the panel: nothing to push.
  const pushes = options.panelMode === "push" && !isCanvasOn();
  if (pushes) shiftPage(widthOnScreen());
  else restorePage();
  const sliding = pushes && panel !== null && panel.getAnimations().length > 0;
  pushFrame = sliding ? requestAnimationFrame(pushPage) : 0;
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

/** The » button opens a small menu: the Reference tab, the push/float and canvas switches and "Collapse panel". */
function mountMoreMenu(el: HTMLElement): void {
  const button = part(el, ".more-button");
  const menu = part(el, ".more-menu");
  const push = part(menu, '[data-action="push"]');
  const onCanvas = part(menu, '[data-action="canvas"]');
  const showSwitches = () => {
    push.setAttribute("aria-checked", String(options.panelMode === "push"));
    onCanvas.setAttribute("aria-checked", String(isCanvasOn()));
  };
  const setOpen = (open: boolean) => {
    // The canvas can also be left from its own toolbar.
    if (open) showSwitches();
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

  push.addEventListener("click", () => {
    options.panelMode = options.panelMode === "push" ? "float" : "push";
    showSwitches();
    saveLayout(el);
    reportDock();
  });
  onCanvas.addEventListener("click", () => {
    setCanvas(!isCanvasOn());
    showSwitches();
  });
  showSwitches();
}

function createPanel(): HTMLElement {
  const el = mount(h("div", "panel"));
  el.innerHTML = template;
  loadLayout(el);

  // Keys typed in the panel must not trigger the page's own shortcuts.
  el.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (isPanelShortcut(e)) togglePanel(e);
  });
  part(el, ".empty kbd").textContent = ALT_KEY;
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


/** Shows the panel on `el`, or with nothing pinned. */
function showPanel(el: Element | null, change: SelectionChange): void {
  panel ??= createPanel();
  panel.classList.remove(CLOSED);
  panel.classList.toggle("is-empty", el === null);
  part(panel, ".rail .name").textContent = el ? `Inspect · ${elementName(el)}` : "Inspect";
  if (change === "pinned") setCollapsed(panel, false);
  if (el) TABS.forEach((tab) => tab.render(el, change));
  reportDock();
}

/** Alt + Shift + G, by the key's place on the keyboard: Alt changes the letter it types. */
const isPanelShortcut = (e: KeyboardEvent): boolean => e.altKey && e.shiftKey && e.code === "KeyG";

/** The shortcut opens the panel with nothing pinned; pressed again, it closes the panel. */
function togglePanel(e: KeyboardEvent): void {
  e.preventDefault();
  if (!isOpen()) showPanel(null, "pinned");
  // Unpinning closes the panel, with or without an element.
  else unpin();
}

export function startPanel(): void {
  onSelection((el, change) => {
    if (el) {
      showPanel(el, change);
      return;
    }
    // Unpinned: the panel closes. Any other change (a setting, a new frame
    // size) leaves a panel that is open with nothing pinned as it is.
    if (change === "pinned") panel?.classList.add(CLOSED);
    reportDock();
  });
  onPage("keydown", (e) => {
    if (isPanelShortcut(e)) togglePanel(e);
  });
  // The canvas opened or closed: the page is pushed only while it is off.
  onPageView(reportDock);
}
