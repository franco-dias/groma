/** Moves the frame with the pointer, from a press until its release. */
import { show } from "./canvas-draw";
import { getView } from "./canvas-state";
import { drag } from "./pointer-drag";
import { markSpaceDragged } from "./space-hold";

export function pan(down: PointerEvent): void {
  const start = getView();
  markSpaceDragged();
  drag(down, {
    onMove: (deltaX, deltaY) => show({ ...start, x: start.x + deltaX, y: start.y + deltaY }),
    onEnd: () => {},
  });
}
