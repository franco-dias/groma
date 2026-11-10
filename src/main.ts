/**
 * Groma — a Figma-style inspector for any HTML page.
 *
 *   Alt + hover         box model of the hovered element, with a name chip
 *   Alt + click         pin the element: the side panel opens
 *   Alt + hover         while an element is pinned: distances from it
 *   Alt + right-click   list every layer under the pointer
 *   Alt + Shift + G     open the side panel with nothing pinned, or close it
 *
 * The launcher pill (bottom right) locks inspect mode on, so none of these
 * need Alt.
 *
 * The » menu of the panel can also show the page on a canvas: in a frame to
 * resize and zoom (canvas/canvas.ts).
 *
 * This file only wires the features together. Each one lives in its own
 * module; start with overlay/hover.ts and panel/panel.ts.
 */
import { startCanvas } from "./canvas/canvas";
import { type Config, configure, configureFromScriptTag } from "./config";
import { replayOverrides } from "./edits/overrides";
import { startLauncher } from "./launcher";
import { pinFromLink } from "./link";
import { highlight, startOutlines } from "./outlines";
import { startHover } from "./overlay/hover";
import { startLayerMenu } from "./overlay/layer-menu";
import { startPanel } from "./panel/panel";
import { isGromaFrame } from "./page";
import { pin, pinnedElement } from "./selection";

/** For pages that re-render and need to bring the inspector along. */
export interface GromaApi {
  /** Pins an element, as Alt+click does. */
  pin(el: Element): void;
  /** The element pinned in the panel, or null. */
  pinnedElement(): Element | null;
  /** Re-applies saved edits to the whole page, or only inside `root`. */
  replayOverrides(root?: ParentNode): void;
  /** Moves the pinned-element outline to `el`. */
  highlight(el: Element): void;
  /** Changes how values are copied and which tokens show a theme path (see config.ts). */
  configure(changes?: Partial<Config>): void;
}

function start(): void {
  configureFromScriptTag();
  startOutlines();
  startPanel();
  startHover();
  startLayerMenu();
  startLauncher();

  // Saved edits: now for a page that is already parsed, then again as the
  // page fills in. Pages that render later still call replayOverrides().
  replayOverrides();
  document.addEventListener("DOMContentLoaded", () => replayOverrides());
  window.addEventListener("load", () => replayOverrides());
  pinFromLink();

  window.Groma = { pin, pinnedElement, replayOverrides, highlight, configure };
  // Last: the frame's own copy of the script looks for `Groma` in this window.
  startCanvas();
}

if (isGromaFrame(window)) {
  // This copy runs inside the canvas frame of an inspector in the window
  // above. That one does the work; the page here still finds its `Groma`.
  window.Groma = window.parent.Groma;
} else if (!window.Groma) {
  // A page may include the script twice (a tag in the page and one injected).
  start();
}
