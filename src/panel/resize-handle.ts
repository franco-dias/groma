/** Dragging the panel's left edge changes its width. */
import { reportDock } from "./dock";
import { saveLayout } from "./layout";
import { part } from "./tab";

const MIN_WIDTH_PX = 320;
const MAX_WIDTH_PX = 560;

export function resizeByDragging(panel: HTMLElement): void {
  part(panel, ".resize").addEventListener("mousedown", (down) => {
    down.preventDefault();
    const startWidth = panel.offsetWidth;
    const move = (event: MouseEvent): void => {
      const width = startWidth + down.clientX - event.clientX;
      panel.style.width = `${Math.max(MIN_WIDTH_PX, Math.min(MAX_WIDTH_PX, width))}px`;
      reportDock();
    };
    const stop = (): void => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      saveLayout(panel);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}
