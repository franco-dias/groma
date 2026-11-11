/**
 * The » button opens a small menu: the Reference tab, the push/float and
 * canvas switches and "Collapse panel".
 */
import { isCanvasOn, toggleCanvas } from "../canvas/canvas";
import { options } from "../options";
import { collapsePanel, reportDock } from "./dock";
import { saveLayout, setTab } from "./layout";
import { part } from "./tab";

/** The pieces of the menu the code reaches. */
type MoreMenu = { button: HTMLElement; menu: HTMLElement; push: HTMLElement; onCanvas: HTMLElement };

function showSwitches({ push, onCanvas }: MoreMenu): void {
  push.setAttribute("aria-checked", String(options.panelMode === "push"));
  onCanvas.setAttribute("aria-checked", String(isCanvasOn()));
}

function openMenu(more: MoreMenu): void {
  // The canvas can also be left from its own toolbar.
  showSwitches(more);
  more.menu.hidden = false;
  more.button.setAttribute("aria-expanded", "true");
}

function closeMenu({ menu, button }: MoreMenu): void {
  menu.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function mountOpening(panel: HTMLElement, more: MoreMenu): void {
  more.button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (more.menu.hidden) openMenu(more);
    else closeMenu(more);
  });
  // Any other click in the panel, or Esc, closes the menu.
  panel.addEventListener("click", () => closeMenu(more));
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu(more);
  });
}

function mountActions(panel: HTMLElement, more: MoreMenu): void {
  part(more.menu, '[data-tab="reference"]').addEventListener("click", () => setTab(panel, "reference"));
  part(more.menu, ".collapse").addEventListener("click", () => collapsePanel(panel));
  more.push.addEventListener("click", () => {
    options.panelMode = options.panelMode === "push" ? "float" : "push";
    showSwitches(more);
    saveLayout(panel);
    reportDock();
  });
  more.onCanvas.addEventListener("click", () => {
    toggleCanvas();
    showSwitches(more);
  });
}

export function mountMoreMenu(panel: HTMLElement): void {
  const menu = part(panel, ".more-menu");
  const more = {
    button: part(panel, ".more-button"),
    menu,
    push: part(menu, '[data-action="push"]'),
    onCanvas: part(menu, '[data-action="canvas"]'),
  };
  mountOpening(panel, more);
  mountActions(panel, more);
  showSwitches(more);
}
