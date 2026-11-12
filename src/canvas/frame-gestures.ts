/** Moving and zooming the canvas with the pointer over the framed page: Ctrl/⌘ + wheel zooms, a middle-button drag moves. */
import { toWindowPoint } from "../page";
import { pan } from "./pan";
import { zoomOrMoveOnWheel } from "./wheel";

const MIDDLE_BUTTON = 1;

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

/** Starts both on a page the frame has loaded. */
export function watchFramedGestures(page: Document): void {
  watchFramedWheel(page);
  watchFramedMiddleButton(page);
}
