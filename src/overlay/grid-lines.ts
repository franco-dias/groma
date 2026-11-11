/**
 * The track lines of the pinned grid, drawn on the page: a thin dashed line
 * at each edge of the columns and rows (one more line than there are tracks;
 * with a gap, the line is in its middle), and the gaps between tracks lightly
 * filled, so the grid can be seen. Placed on animation frames like the
 * pinned outline, so they follow scroll, resize and edits. A grid that is
 * only hovered gets none; they go when another element is pinned, on unpin,
 * when the element stops being a grid and when it leaves the page.
 */
import { h, placeOver, type Scale, scaleOf } from "../dom";
import { contentOrigin, readGridAxes } from "../grid-axes";
import { rectOf } from "../page";
import { mountOnPage } from "../root";
import { findSpots, type Spot } from "../specs/grid-spots";
import { findTrackLines } from "../specs/track-lines";
import { findPinnedElement, onSelection } from "../selection";

let layer: HTMLElement | undefined;
let tracked: Element | undefined;
let tickFrame = 0;
/** What the lines were drawn from, so a frame in which nothing moved changes nothing. */
let drawnFrom = "";

const isGrid = (element: Element): boolean => getComputedStyle(element).display.includes("grid");

/** Where the grid is in the window, how much it is zoomed, and where its content box starts inside it. */
type Frame = { rect: DOMRect; scale: Scale; origin: { x: number; y: number } };

/** The node for a spot: layout pixels of the content box turned into window pixels. */
function toNode({ className, left, top, width, height }: Spot, { rect, scale, origin }: Frame): HTMLElement {
  const node = h("div", className);
  placeOver(node, {
    left: rect.left + (origin.x + left) * scale.x,
    top: rect.top + (origin.y + top) * scale.y,
    width: width * scale.x,
    height: height * scale.y,
  });
  return node;
}

function draw(grid: Element): void {
  layer ??= mountOnPage(h("div", "grid-lines"));
  const rect = rectOf(grid);
  const frame = { rect, scale: scaleOf(grid, rect), origin: contentOrigin(grid) };
  const { columns, rows } = readGridAxes(grid);
  const spots = findSpots({
    columns: findTrackLines(columns),
    rows: findTrackLines(rows),
    availableAcross: columns.available,
    availableDown: rows.available,
  });
  const signature = JSON.stringify([frame, spots]);
  if (signature === drawnFrom) return;
  drawnFrom = signature;
  layer.replaceChildren(...spots.map((spot) => toNode(spot, frame)));
}

function clear(): void {
  layer?.replaceChildren();
  drawnFrom = "";
}

function tick(): void {
  tickFrame = 0;
  if (!tracked?.isConnected) {
    clear();
    return;
  }
  if (isGrid(tracked)) draw(tracked);
  else clear();
  tickFrame = requestAnimationFrame(tick);
}

function follow(element: Element | undefined): void {
  tracked = element && isGrid(element) ? element : undefined;
  if (!tracked) {
    clear();
    return;
  }
  if (!tickFrame) tickFrame = requestAnimationFrame(tick);
}

export function startGridLines(): void {
  onSelection(() => follow(findPinnedElement()));
}
