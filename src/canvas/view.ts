/** The canvas arithmetic: frame sizes, zoom and where the frame sits. No page needed. */

export interface Size {
  width: number;
  height: number;
}

/** Where the frame's top-left corner is on the canvas, and how much it is zoomed. */
export interface View {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const MIN_SIZE: Size = { width: 240, height: 160 };
const MAX_SIZE: Size = { width: 3840, height: 2400 };

/** Room kept around a fitted frame: the toolbar and the size label sit above it. */
const MARGIN = { top: 80, side: 32, bottom: 32 };

const between = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const clampZoom = (zoom: number): number => between(zoom, MIN_ZOOM, MAX_ZOOM);

/** A frame size the canvas accepts, in whole pixels. */
export const clampSize = (size: Size): Size => ({
  width: Math.round(between(size.width, MIN_SIZE.width, MAX_SIZE.width)),
  height: Math.round(between(size.height, MIN_SIZE.height, MAX_SIZE.height)),
});

/**
 * The view that shows the whole frame in `area`, centred, at its real size when
 * there is room and zoomed out when there is not. It never zooms in.
 */
export function fitView(frame: Size, area: Size): View {
  const room = {
    width: area.width - 2 * MARGIN.side,
    height: area.height - MARGIN.top - MARGIN.bottom,
  };
  const zoom = clampZoom(Math.min(1, room.width / frame.width, room.height / frame.height));
  return {
    x: Math.round(MARGIN.side + (room.width - frame.width * zoom) / 2),
    y: MARGIN.top,
    zoom,
  };
}

/** Zooms to `zoom` and keeps the canvas point (`x`, `y`) over the same spot of the page. */
export function zoomAt(view: View, zoom: number, x: number, y: number): View {
  const next = clampZoom(zoom);
  const ratio = next / view.zoom;
  return { x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, zoom: next };
}
