/** Puts the canvas's frame, handles and labels where the size and the view say. */
import { placeOver } from "../dom";
import { pageViewChanged } from "../page";
import {
  findCanvas,
  getCanvas,
  getCanvasPart,
  getSize,
  getView,
  setChosenView,
  setFittedView,
} from "./canvas-state";
import { fitView, type View, zoomAt } from "./view";

/** Puts the frame, its handles and the labels where `size` and `view` say. */
export function draw(): void {
  if (!findCanvas()) return;
  const size = getSize();
  const view = getView();
  getCanvasPart(".canvas-stage").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  const box = getCanvasPart(".canvas-frame");
  box.style.width = `${size.width}px`;
  box.style.height = `${size.height}px`;
  placeOver(getCanvasPart(".canvas-chrome"), {
    left: view.x,
    top: view.y,
    width: size.width * view.zoom,
    height: size.height * view.zoom,
  });
  getCanvasPart(".canvas-size").textContent = `${size.width} × ${size.height}`;
  getCanvasPart(".canvas-zoom").textContent = `${Math.round(view.zoom * 100)}%`;
  pageViewChanged();
}

export function fit(): void {
  const canvas = findCanvas();
  if (!canvas) return;
  setFittedView(
    fitView(getSize(), { width: canvas.element.clientWidth, height: canvas.element.clientHeight }),
  );
  draw();
}

/** A view the user chose: it is kept when the canvas changes size. */
export function show(next: View): void {
  setChosenView(next);
  draw();
}

/** Zooms by `factor` around a point of the canvas; the middle of it when none is given. */
export function zoomBy(factor: number, around?: { x: number; y: number }): void {
  const { element } = getCanvas();
  const point = around ?? { x: element.clientWidth / 2, y: element.clientHeight / 2 };
  const view = getView();
  show(zoomAt(view, { zoom: view.zoom * factor, around: point }));
}
