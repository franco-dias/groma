/**
 * The boxes the track lines of a grid are drawn with: a line for each edge of
 * the columns and rows, and a band for each gap, in layout pixels from the
 * start of the grid's content box.
 */
import type { TrackLines } from "./track-lines";

export type Spot = { className: string; left: number; top: number; width: number; height: number };

/** The lines of both axes, and the room on each, for an axis that has no tracks. */
export type GridLines = {
  columns: TrackLines;
  rows: TrackLines;
  availableAcross: number;
  availableDown: number;
};

type Extent = { from: number; to: number };
type Band = { start: number; end: number };

/** From the first line to the last; the whole room when there are none. */
const extentOf = ({ lines }: TrackLines, available: number): Extent => ({
  from: lines[0] ?? 0,
  to: lines.at(-1) ?? available,
});

const atPosition = (position: number): Band => ({ start: position, end: position });

/** What a spot is called, and how far it runs along its length. */
type Run = { className: string; extent: Extent };

const vertical = ({ start, end }: Band, { className, extent }: Run): Spot => ({
  className,
  left: start,
  top: extent.from,
  width: end - start,
  height: extent.to - extent.from,
});

const horizontal = ({ start, end }: Band, { className, extent }: Run): Spot => ({
  className,
  left: extent.from,
  top: start,
  width: extent.to - extent.from,
  height: end - start,
});

export function findSpots({ columns, rows, availableAcross, availableDown }: GridLines): Spot[] {
  const across = extentOf(columns, availableAcross);
  const down = extentOf(rows, availableDown);
  const [gapDown, gapAcross] = [
    { className: "grid-gap", extent: down },
    { className: "grid-gap", extent: across },
  ];
  const columnLine = { className: "grid-line is-column", extent: down };
  const rowLine = { className: "grid-line is-row", extent: across };
  return [
    ...columns.gaps.map((band) => vertical(band, gapDown)),
    ...rows.gaps.map((band) => horizontal(band, gapAcross)),
    ...columns.lines.map((position) => vertical(atPosition(position), columnLine)),
    ...rows.lines.map((position) => horizontal(atPosition(position), rowLine)),
  ];
}
