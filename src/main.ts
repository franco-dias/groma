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
import { replayOverrides } from "./edits/replay";
import { startLauncher } from "./launcher";
import { pinFromLink } from "./link";
import { highlight, startOutlines } from "./outlines";
import { startHover } from "./overlay/hover";
import { startLayerMenu } from "./overlay/layer-menu";
import { startPanel } from "./panel/panel";
import { isGromaFrame } from "./page";
import { findPinnedElement, pin } from "./selection";

/** For pages that re-render and need to bring the inspector along. */
export type GromaApi = {
  /** Pins an element, as Alt+click does. */
  pin(element: Element): void;
  /** The element pinned in the panel, or null. */
  // oxlint-disable-next-line unicorn/no-null -- the published contract answers null
  pinnedElement(): Element | null;
  /** Re-applies saved edits to the whole page, or only inside `root`. */
  replayOverrides(root?: ParentNode): void;
  /** Moves the pinned-element outline to `element`. */
  highlight(element: Element): void;
  /** Changes how values are copied and which tokens show a theme path (see config.ts). */
  configure(changes?: Partial<Config>): void;
};

/** The pinned element for a host page, which expects null when nothing is pinned (the public contract). */
// oxlint-disable-next-line unicorn/no-null -- `Groma.pinnedElement()` answers null, as published
const findOrNull = (): Element | null => findPinnedElement() ?? null;

function start(): void {
  configureFromScriptTag();
  startOutlines();
  startPanel();
  startHover();
  startLayerMenu();
  startLauncher();

  // Saved edits are not put back here: the user does that from the panel,
  // which says when some are missing. A page can still call replayOverrides().
  pinFromLink();

  window.Groma = { pin, pinnedElement: findOrNull, replayOverrides, highlight, configure };
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
