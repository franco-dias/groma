/**
 * Where the panel sits: open or closed, collapsed to its rail, and how much
 * of the right edge it takes. In push mode the page makes room for it.
 */
import { isCanvasOn } from "../canvas/canvas";
import { options } from "../options";
import { restorePage, shiftPage } from "../page-shift";
import { setRootVariable } from "../root";

/**
 * On a closed panel. The stylesheet slides the panel in and out around this
 * class; everything else treats the panel as closed from the moment it is set.
 */
const CLOSED = "is-closed";

let panel: HTMLElement | undefined;
let pushFrame = 0;

/** Makes `element` the panel the rest of this module describes. */
export function connectDock(element: HTMLElement): void {
  panel = element;
}

export const isPanelOpen = (): boolean => panel !== undefined && !panel.classList.contains(CLOSED);

export function openPanel(): void {
  panel?.classList.remove(CLOSED);
}

export function closePanel(): void {
  panel?.classList.add(CLOSED);
}

export function collapsePanel(element: HTMLElement): void {
  element.classList.add("is-collapsed");
  reportDock();
}

export function expandPanel(element: HTMLElement): void {
  element.classList.remove("is-collapsed");
  reportDock();
}

/**
 * Tells the rest of the inspector how much of the right edge the panel takes,
 * and, in push mode, makes room for it in the page.
 */
export function reportDock(): void {
  const width = panel && isPanelOpen() ? panel.offsetWidth : 0;
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

const pushesPage = (): boolean => options.panelMode === "push" && !isCanvasOn();

/**
 * Push mode: the page gives way by as much of the panel as is on screen, so it
 * moves with the panel while the panel slides, frame by frame, and never ahead
 * of it or behind. On the canvas the page is in a frame beside the panel:
 * nothing to push.
 */
function pushPage(): void {
  if (!pushesPage()) {
    restorePage();
    pushFrame = 0;
    return;
  }
  shiftPage(widthOnScreen());
  const isSliding = panel !== undefined && panel.getAnimations().length > 0;
  pushFrame = isSliding ? requestAnimationFrame(pushPage) : 0;
}
