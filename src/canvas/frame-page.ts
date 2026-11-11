/** The page inside the canvas frame: how the frame is filled, and what happens each time it loads. */
import { carryEdits } from "../edits/replay";
import { frameLoaded, toWindowPoint } from "../page";
import { HOST_TAG } from "../root";
import { findPinnedElement, pin, unpin } from "../selection";
import { findCanvas, getCanvasPart } from "./canvas-state";
import { pan } from "./pan";
import { zoomOrMoveOnWheel } from "./wheel";

const MIDDLE_BUTTON = 1;

/** True for a page opened from disk: the browser never lets us read a frame that loads its address. */
export const isFromDisk = (): boolean => location.protocol === "file:";

/** Pins the element a selector leads to in `page`, when there is one. */
export function pinBySelector(page: Document, selector: string | undefined): void {
  const element = selector ? findBySelector(page, selector) : undefined;
  if (element) pin(element);
}

function findBySelector(page: Document, selector: string): Element | undefined {
  try {
    return page.querySelector(selector) ?? undefined;
  } catch {
    // Not a selector this document accepts.
    return undefined;
  }
}

/**
 * The page as it is now, as HTML, without the inspector. Its scripts run
 * again when a frame is filled with it.
 *
 * shortcut: edits already replayed on the page are part of the copy, so in the
 * frame "reset" puts back the edited value, not the page's own; upgrade by
 * undoing saved edits in the clone if someone edits and then opens a copy.
 */
export function pageCopy(page: Document): string {
  // Cast: the root of an HTML document is an HTML element.
  const root = page.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll(HOST_TAG).forEach((host) => host.remove());
  const doctype = page.doctype ? `<!doctype ${page.doctype.name}>` : "";
  return doctype + root.outerHTML;
}

/** Fills the frame with HTML instead of an address. The browser lets us read such a frame. */
export function fillFrame(from: "copy" | "file", html: string): void {
  const canvas = findCanvas();
  if (!canvas) return;
  canvas.filledFrom = from;
  canvas.firstAddress = "";
  canvas.frame.removeAttribute("src");
  canvas.frame.srcdoc = html;
}

/** The frame's address, or "" when the browser does not let us read it. */
export function frameAddress(frame: HTMLIFrameElement): string {
  try {
    return frame.contentWindow?.location.href ?? "";
  } catch {
    return "";
  }
}

/** Ctrl/⌘ + wheel zooms the canvas, not the browser, also over the page. */
function watchFramedWheel(page: Document): void {
  page.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      zoomOrMoveOnWheel(event, toWindowPoint({ x: event.clientX, y: event.clientY }, page));
    },
    { passive: false, capture: true },
  );
}

/** A middle-button drag over the page moves the canvas. */
function watchFramedMiddleButton(page: Document): void {
  page.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button === MIDDLE_BUTTON) pan(event);
    },
    true,
  );
  // ...and must not start the browser's own middle-button scrolling.
  page.addEventListener(
    "mousedown",
    (event) => {
      if (event.button === MIDDLE_BUTTON) event.preventDefault();
    },
    true,
  );
}

/**
 * Runs each time the frame has loaded a page: the first time, and again when
 * the user follows a link inside it. `repin` is the element to pin again on
 * the first load, as a selector.
 */
export function onFrameLoad(repin: string | undefined): void {
  const canvas = findCanvas();
  if (!canvas) return;
  const address = frameAddress(canvas.frame);
  // The empty document a frame starts with: the page is still to come.
  if (address === "about:blank") return;
  const readable = frameLoaded();
  // The page's own address was refused: show a copy of the page instead.
  if (!readable && !canvas.firstAddress && canvas.filledFrom === "address") {
    fillFrame("copy", canvas.copy());
    return;
  }
  getCanvasPart(".canvas-blocked").hidden = readable;
  // An element pinned before this load belongs to a page that is gone.
  if (findPinnedElement()) unpin();
  if (readable) useLoadedPage(canvas.frame, { address, repin });
}

function useLoadedPage(frame: HTMLIFrameElement, load: { address: string; repin: string | undefined }): void {
  // Cast: the page was readable, so the frame has its document.
  const page = frame.contentDocument as Document;
  watchFramedWheel(page);
  watchFramedMiddleButton(page);
  carryEdits();
  const canvas = findCanvas();
  if (!canvas || canvas.firstAddress) return;
  canvas.firstAddress = load.address;
  pinBySelector(page, load.repin);
}
