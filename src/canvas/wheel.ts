/** The mouse wheel on the canvas: Ctrl/⌘ + wheel zooms, a plain wheel moves the frame. */
import type { Point } from "../page";
import { show, zoomBy } from "./canvas-draw";
import { getView } from "./canvas-state";

/** How fast Ctrl/⌘ + wheel zooms. */
const WHEEL_ZOOM = 0.01;

/** `around` is where the pointer is on the canvas. */
export function zoomOrMoveOnWheel(event: WheelEvent, around: Point): void {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    zoomBy(Math.exp(-event.deltaY * WHEEL_ZOOM), around);
    return;
  }
  const view = getView();
  show({ ...view, x: view.x - event.deltaX, y: view.y - event.deltaY });
}
