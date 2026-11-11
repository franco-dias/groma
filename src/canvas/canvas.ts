/**
 * Canvas mode: the page in a frame on a canvas, like an artboard in a design
 * tool. The user drags the frame's edges to try any width and height, zooms
 * with the toolbar or Ctrl/⌘ + wheel, and moves around by dragging the canvas
 * or scrolling. Over the page, where a plain drag belongs to the page, Space +
 * drag and a middle-button drag move the canvas instead. Inspecting works in
 * the frame as it does on the page.
 *
 * The frame loads this page's own address again, so the page runs a second
 * time inside it; the first copy stays underneath, untouched and hidden. The
 * switch is in the panel's » menu and is remembered, with the frame's size.
 *
 * The browser does not let the inspector read a frame that loads a file opened
 * from disk, or a page whose server forbids framing. The frame is then filled
 * with a copy of the page as it is now, which the browser does allow. The
 * page's scripts run again on that copy; for a file from disk, "Use the file…"
 * loads the original HTML instead when the copy looks wrong.
 */
import { h } from "../dom";
import { carryEdits } from "../edits/replay";
import { getSelector } from "../edits/selector";
import { clearFrame, setFrame } from "../page";
import { mount, whenBodyExists } from "../root";
import { findPinnedElement, unpin } from "../selection";
import { wireControls } from "./canvas-controls";
import { fit } from "./canvas-draw";
import {
  type Canvas,
  endSession,
  findCanvas,
  getCanvasPart,
  isCanvasOn,
  isViewFitted,
  startSession,
} from "./canvas-state";
import { readSavedSize, saveCanvas, wasCanvasOn } from "./canvas-store";
import template from "./canvas.html?raw";
import { fillFrame, frameAddress, isFromDisk, onFrameLoad, pageCopy, pinBySelector } from "./frame-page";
import { watchSpace } from "./space-hold";

export { isCanvasOn, pageCopy };

/** Where the frame loads from, how to copy the open page when that is refused, and what to pin again. */
type CanvasOpening = { source: string; copy: () => string; repin: string | undefined };

function createCanvas(copy: () => string, watcher: ResizeObserver): Canvas {
  const element = mount(h("div", "canvas"));
  element.innerHTML = template;
  // Cast: canvas.html has its frame.
  const frame = element.querySelector("iframe") as HTMLIFrameElement;
  return {
    element,
    frame,
    firstAddress: "",
    filledFrom: "address",
    copy,
    stopWatching: () => watcher.disconnect(),
  };
}

function open({ source, copy, repin }: CanvasOpening): void {
  // The panel opened or closed, or the window changed size.
  const watcher = new ResizeObserver(() => {
    if (isViewFitted()) fit();
  });
  const canvas = createCanvas(copy, watcher);
  const { element, frame } = canvas;
  startSession(canvas, readSavedSize());
  setFrame(frame);
  wireControls(element, hideCanvas);
  frame.addEventListener("load", () => onFrameLoad(repin));
  getCanvasPart('[data-action="choose-file"]').hidden = !isFromDisk();
  // After `setFrame`: by now the panel has taken its push off the page.
  if (isFromDisk()) fillFrame("copy", copy());
  else frame.src = source;
  fit();
  watcher.observe(element);
}

function close(repin: string | undefined): void {
  const canvas = findCanvas();
  if (!canvas) return;
  const { element, frame, firstAddress } = canvas;
  const address = frameAddress(frame);
  canvas.stopWatching();
  element.remove();
  endSession();
  clearFrame();
  saveCanvas();
  // The user followed a link in the frame: the page underneath is the old one.
  if (address && firstAddress && address !== firstAddress) {
    location.assign(address);
    return;
  }
  // shortcut: an edit reset on the canvas stays on the page underneath until a
  // reload; upgrade by undoing saved edits here when that confuses someone.
  carryEdits();
  pinBySelector(document, repin);
}

/** Unpins for the switch, and gives the selector to pin again when the other copy of the page has it. */
function unpinForSwitch(): string | undefined {
  const pinned = findPinnedElement();
  if (!pinned) return undefined;
  const repin = getSelector(pinned);
  unpin();
  return repin;
}

/** Where the frame loads from, and how to copy the open page when the browser refuses that address. */
export type CanvasRequest = { source?: string; copy?: () => string };

/**
 * Turns canvas mode on. The pinned element stays pinned across the switch
 * when the other copy of the page has it too. `source` is the address the
 * frame shows, this page's own, and `copy` gives the page as HTML for when
 * the browser refuses that address.
 */
export function showCanvas({
  source = location.href,
  copy = () => pageCopy(document),
}: CanvasRequest = {}): void {
  if (isCanvasOn()) return;
  open({ source, copy, repin: unpinForSwitch() });
  saveCanvas();
}

export function hideCanvas(): void {
  if (!isCanvasOn()) return;
  close(unpinForSwitch());
}

export function toggleCanvas(): void {
  if (isCanvasOn()) {
    hideCanvas();
    return;
  }
  showCanvas();
}

/** Reopens the canvas on a page where the user left it on. */
export function startCanvas(): void {
  watchSpace();
  if (wasCanvasOn()) whenBodyExists(() => showCanvas());
}
