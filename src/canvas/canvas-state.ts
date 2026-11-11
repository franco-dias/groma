/**
 * What the open canvas is: its elements, the frame's size and where the frame
 * sits. The other canvas modules read and change it through these functions.
 */
import type { Size, View } from "./view";

export const DEFAULT_SIZE: Size = { width: 1280, height: 800 };

export type Canvas = {
  element: HTMLElement;
  frame: HTMLIFrameElement;
  /** The address the frame showed first; a different one later means the user followed a link. */
  firstAddress: string;
  /** What the frame was given: the page's address, a copy of the open page, or a file the user chose. */
  filledFrom: "address" | "copy" | "file";
  /** The open page as HTML, for when its address cannot be used. */
  copy(): string;
  /** Stops watching the canvas's own size. */
  stopWatching(): void;
};

let canvas: Canvas | undefined;
let size: Size = DEFAULT_SIZE;
let view: View = { x: 0, y: 0, zoom: 1 };
/** True until the user moves or zooms: a fitted frame stays fitted when the canvas changes size. */
let isFitted = true;

export const isCanvasOn = (): boolean => canvas !== undefined;

export const findCanvas = (): Canvas | undefined => canvas;

export function getCanvas(): Canvas {
  if (!canvas) throw new Error("groma: the canvas is not open");
  return canvas;
}

/** An element of canvas.html. */
export function getCanvasPart<TElement extends HTMLElement = HTMLElement>(selector: string): TElement {
  const found = getCanvas().element.querySelector<TElement>(selector);
  if (!found) throw new Error(`groma: canvas.html has no "${selector}"`);
  return found;
}

export function startSession(opened: Canvas, frameSize: Size): void {
  canvas = opened;
  size = frameSize;
}

export function endSession(): void {
  canvas = undefined;
}

export const getSize = (): Size => size;
export const getView = (): View => view;
export const isViewFitted = (): boolean => isFitted;

/** The frame got this size from a preset; the view is about to be fitted to it. */
export function setPresetSize(next: Size): void {
  size = next;
}

/** The user dragged a handle: a frame sized by hand is not fitted any more. */
export function setDraggedSize(next: Size): void {
  size = next;
  isFitted = false;
}

export function setFittedView(next: View): void {
  view = next;
  isFitted = true;
}

/** A view the user chose: it is kept when the canvas changes size. */
export function setChosenView(next: View): void {
  view = next;
  isFitted = false;
}
