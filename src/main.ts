/**
 * live-inspector — a Figma-style inspector for any HTML page.
 *
 *   Alt + hover         box model of the hovered element, with a name chip
 *   Alt + click         pin the element: the side panel opens
 *   Alt + hover         while an element is pinned: distances from it
 *   Alt + right-click   list every layer under the pointer
 *
 * The launcher pill (bottom right) locks inspect mode on, so none of these
 * need Alt.
 *
 * This file only wires the features together. Each one lives in its own
 * module; start with overlay/hover.ts and panel/panel.ts.
 */
import { replayOverrides } from "./edits/overrides";
import { startLauncher } from "./launcher";
import { pinFromLink } from "./link";
import { highlight, startOutlines } from "./outlines";
import { startHover } from "./overlay/hover";
import { startLayerMenu } from "./overlay/layer-menu";
import { startPanel } from "./panel/panel";
import { pin, pinnedElement } from "./selection";

/** For pages that re-render and need to bring the inspector along. */
export interface LiveInspectorApi {
  /** Pins an element, as Alt+click does. */
  pin(el: Element): void;
  /** The element pinned in the panel, or null. */
  pinnedElement(): Element | null;
  /** Re-applies saved edits to the whole page, or only inside `root`. */
  replayOverrides(root?: ParentNode): void;
  /** Moves the pinned-element outline to `el`. */
  highlight(el: Element): void;
}

function start(): void {
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

  window.LiveInspector = { pin, pinnedElement, replayOverrides, highlight };
}

// A page may include the script twice (a tag in the page and one injected).
if (!window.LiveInspector) start();
