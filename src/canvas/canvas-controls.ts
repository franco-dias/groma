/** The canvas's controls: the toolbar, the resize handles, the wheel, and dragging the canvas itself. */
import { clampSize } from "./view";
import { draw, fit, zoomBy } from "./canvas-draw";
import { getCanvasPart, getSize, getView, setDraggedSize, setPresetSize } from "./canvas-state";
import { drag } from "./pointer-drag";
import { fillFrame } from "./frame-page";
import { pan } from "./pan";
import { rerender } from "../selection";
import { saveCanvas } from "./canvas-store";
import { zoomOrMoveOnWheel } from "./wheel";

/** One press of a zoom button. */
const ZOOM_STEP = 1.25;
const MIDDLE_BUTTON = 1;

/** After the frame got a new size: the page laid itself out again, so the panel is out of date. */
function sizeChanged(): void {
  saveCanvas();
  rerender();
}

function resizeByDragging(handle: HTMLElement): void {
  const axes = handle.dataset.resize ?? "";
  handle.addEventListener("pointerdown", (down) => {
    const start = getSize();
    drag(down, {
      onMove: (deltaX, deltaY) => {
        // The handle moves in screen pixels; the frame is sized in its own.
        const { zoom } = getView();
        setDraggedSize(
          clampSize({
            width: start.width + (axes.includes("x") ? deltaX / zoom : 0),
            height: start.height + (axes.includes("y") ? deltaY / zoom : 0),
          }),
        );
        draw();
      },
      onEnd: sizeChanged,
    });
  });
}

/** A preset button: "375x812" is its `data-size`. */
function tryApplyPreset(button: HTMLElement): boolean {
  const [width, height] = (button.dataset.size ?? "").split("x").map(Number);
  if (!width || !height) return false;
  setPresetSize(clampSize({ width, height }));
  fit();
  sizeChanged();
  return true;
}

function pressButton(button: HTMLElement, exit: () => void): void {
  if (tryApplyPreset(button)) return;
  const action = button.dataset.action;
  if (action === "zoom-in") zoomBy(ZOOM_STEP);
  if (action === "zoom-out") zoomBy(1 / ZOOM_STEP);
  if (action === "zoom-reset") zoomBy(1 / getView().zoom);
  if (action === "fit") fit();
  if (action === "exit") exit();
  if (action === "choose-file") getCanvasPart<HTMLInputElement>('input[type="file"]').click();
}

/** A drag moves the frame when it starts on the canvas itself, with Space held, or with the middle button. */
function mountCanvasDrag(canvas: HTMLElement): void {
  canvas.addEventListener("pointerdown", (down) => {
    // The toolbar and the handles keep their own drags.
    const onControl = (down.target as Element).closest(".canvas-bar, .canvas-handle, .canvas-blocked");
    const moves =
      down.target === canvas || canvas.classList.contains("is-panning") || down.button === MIDDLE_BUTTON;
    if (moves && !onControl) pan(down);
  });
}

/** "Use the file…": the original HTML of a page opened from disk. */
function mountFilePicker(): void {
  const picker = getCanvasPart<HTMLInputElement>('input[type="file"]');
  picker.addEventListener("change", async () => {
    const html = await picker.files?.[0]?.text();
    picker.value = "";
    if (html) fillFrame("file", html);
  });
  // A click on the toolbar must not take the focus: Space would press the button again.
  getCanvasPart(".canvas-bar").addEventListener("mousedown", (event) => event.preventDefault());
}

/** `exit` leaves the canvas, for the toolbar's close button. */
export function wireControls(canvas: HTMLElement, exit: () => void): void {
  canvas.addEventListener("click", (event) => {
    // Cast: a click on the canvas comes from one of its elements.
    const button = (event.target as Element).closest<HTMLElement>("[data-size], [data-action]");
    if (button) pressButton(button, exit);
  });
  // Over the canvas the wheel moves the frame; over the page it scrolls the page.
  canvas.addEventListener(
    "wheel",
    (event) => zoomOrMoveOnWheel(event, { x: event.clientX, y: event.clientY }),
    {
      passive: false,
    },
  );
  canvas.querySelectorAll<HTMLElement>("[data-resize]").forEach(resizeByDragging);
  mountCanvasDrag(canvas);
  mountFilePicker();
}
