/** A grid container's two axes read from the page: the size of each track, the gap, the room, how the tracks are distributed. */
import { usedTracks } from "./specs/tracks";
import type { TrackAxis } from "./specs/track-lines";

export type GridAxes = { columns: TrackAxis; rows: TrackAxis };

/** A computed length in pixels; "normal" and anything else that is not a number is no length. */
const toPixels = (value: string): number => Number.parseFloat(value) || 0;

/** The tracks' sizes from the computed list, which holds the pixels the browser laid out. */
const sizesOf = (list: string): number[] => usedTracks(list).map(toPixels);

/**
 * The content box's size on each axis, in layout pixels, from the used width
 * and height (an element's client size is a whole number of pixels, and a
 * grid can be 300.5 wide).
 */
function contentSize(computedStyle: CSSStyleDeclaration): { width: number; height: number } {
  const [left, right, top, bottom] = ["Left", "Right", "Top", "Bottom"].map(
    (side) =>
      toPixels(computedStyle.getPropertyValue(`padding-${side.toLowerCase()}`)) +
      toPixels(computedStyle.getPropertyValue(`border-${side.toLowerCase()}-width`)),
  );
  const isBorderBox = computedStyle.boxSizing === "border-box";
  return {
    width: toPixels(computedStyle.width) - (isBorderBox ? left + right : 0),
    height: toPixels(computedStyle.height) - (isBorderBox ? top + bottom : 0),
  };
}

export function readGridAxes(element: Element): GridAxes {
  const style = getComputedStyle(element);
  const content = contentSize(style);
  return {
    columns: {
      sizes: sizesOf(style.gridTemplateColumns),
      gap: toPixels(style.columnGap),
      available: content.width,
      distribution: style.justifyContent,
    },
    rows: {
      sizes: sizesOf(style.gridTemplateRows),
      gap: toPixels(style.rowGap),
      available: content.height,
      distribution: style.alignContent,
    },
  };
}

/** Where the content box starts inside the border box, in layout pixels. */
export function contentOrigin(element: Element): { x: number; y: number } {
  const style = getComputedStyle(element);
  // Cast: as above; `clientLeft` and `clientTop` are the widths of the left and top borders.
  const { clientLeft, clientTop } = element as HTMLElement;
  return { x: clientLeft + toPixels(style.paddingLeft), y: clientTop + toPixels(style.paddingTop) };
}
