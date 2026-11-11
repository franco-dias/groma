/** Following the pointer from a press until it is released, over the frame or out of it. */
import { type Point, toWindowPoint } from "../page";

/** Where a pointer event is in this window, also when it comes from the frame. */
// Cast: a pointer event's target is a node.
const windowPoint = (event: PointerEvent): Point =>
  toWindowPoint({ x: event.clientX, y: event.clientY }, (event.target as Node).ownerDocument ?? undefined);

/** What a drag does: `onMove` gets the distance from the press, in window pixels. */
export type DragHandlers = { onMove: (deltaX: number, deltaY: number) => void; onEnd: () => void };

function capturePointer(target: Element, pointerId: number): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // No such pointer (a synthetic event): the events still reach the target.
  }
}

/**
 * Follows the pointer from a press until it is released. The pointer is
 * captured by what was pressed, so the drag goes on wherever it passes: over
 * the frame for a press on the canvas, out of the frame for a press inside it.
 */
export function drag(down: PointerEvent, { onMove, onEnd }: DragHandlers): void {
  // Cast: a press lands on an element.
  const target = down.target as Element;
  // The shadow root for the canvas's own parts, the frame's document for the page's.
  const root = target.getRootNode() as Document | ShadowRoot;
  const start = windowPoint(down);
  down.preventDefault();
  capturePointer(target, down.pointerId);
  const move = (event: Event): void => {
    // Cast: the listeners that call this are for pointer events.
    const { x, y } = windowPoint(event as PointerEvent);
    onMove(x - start.x, y - start.y);
  };
  const stop = (): void => {
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerup", stop);
    root.removeEventListener("pointercancel", stop);
    onEnd();
  };
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerup", stop);
  root.addEventListener("pointercancel", stop);
}
