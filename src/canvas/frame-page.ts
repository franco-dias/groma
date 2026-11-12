/**
 * The page inside the canvas frame: how the frame is filled, and what happens
 * each time it loads. The user's edits and the pinned element are carried to
 * it, also when the page draws itself after it has loaded.
 */
import { carryEdits, countEditedOnPage } from "../edits/replay";
import { frameLoaded } from "../page";
import { HOST_TAG } from "../root";
import { findPinnedElement, pin, unpin } from "../selection";
import { findCanvas, getCanvasPart } from "./canvas-state";
import { watchFramedGestures } from "./frame-gestures";
import { stopWaiting, waitForMore } from "./late-page";

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

/**
 * Runs each time the frame has loaded a page: the first time, and again when
 * the user follows a link inside it. `repin` is the element to pin again on
 * the first load, as a selector.
 */
export function onFrameLoad(repin: string | undefined): void {
  const canvas = findCanvas();
  if (!canvas) return;
  stopWaiting();
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

/** Where the edits and the pin go: the frame's page, and the selector of the element to pin again, if any. */
type Carried = { page: Document; repin: string | undefined };

/** Puts the edits on the frame's page and pins again, as far as the page has their elements. */
function carryOver({ page, repin }: Carried): void {
  // The frame has moved on to another page, or the canvas is closed.
  if (findCanvas()?.frame.contentDocument !== page) return;
  carryEdits();
  if (!findPinnedElement()) pinBySelector(page, repin);
}

/** How many of the elements to carry to the page has. */
const countArrived = ({ page, repin }: Carried): number =>
  countEditedOnPage() + (repin && findBySelector(page, repin) ? 1 : 0);

/** The selector to pin again: only the first page the frame shows is the one the pin came from. */
function takeRepin(load: { address: string; repin: string | undefined }): string | undefined {
  const canvas = findCanvas();
  if (!canvas || canvas.firstAddress) return undefined;
  canvas.firstAddress = load.address;
  return load.repin;
}

function useLoadedPage(frame: HTMLIFrameElement, load: { address: string; repin: string | undefined }): void {
  // Cast: the page was readable, so the frame has its document.
  const page = frame.contentDocument as Document;
  watchFramedGestures(page);
  const carried = { page, repin: takeRepin(load) };
  carryOver(carried);
  waitForMore({ page, count: () => countArrived(carried), onMore: () => carryOver(carried) });
}
