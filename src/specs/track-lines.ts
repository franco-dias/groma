/**
 * Where the lines of a grid's tracks fall along one axis, for the track
 * lines drawn on the page: one line at each edge of the tracks, in the middle
 * of each gap, and the gaps as bands. The browser gives the size of each
 * track but not where `justify-content` or `align-content` moved them, so
 * that is worked out here.
 * shortcut: left to right and horizontal text only; `direction: rtl` and
 * vertical writing modes put the tracks the other way, so the lines are off.
 */

/** One axis of a grid: its track sizes, the gap, the room, and how the tracks are distributed in it. */
export type TrackAxis = { sizes: number[]; gap: number; available: number; distribution: string };

/** Positions from the start of the content box, in the same unit as the sizes. */
export type TrackLines = { lines: number[]; gaps: { start: number; end: number }[] };

const SPACING = ["space-between", "space-around", "space-evenly"];
const NOWHERE = { offset: 0, extra: 0 };

/** The room left in the container after the tracks and the gaps between them; negative when they overflow. */
export function freeSpace({ sizes, gap, available }: TrackAxis): number {
  return available - sizes.reduce((total, size) => total + size, 0) - gap * Math.max(sizes.length - 1, 0);
}

/** What a distribution does with the free space: where the tracks start, and what is added to each gap. */
function distribute(axis: TrackAxis): { offset: number; extra: number } {
  const { sizes, distribution } = axis;
  const free = freeSpace(axis);
  // "safe center" is the last word; the spacing keywords fall back to the start when the tracks overflow.
  const mode = distribution.split(" ").at(-1) ?? "";
  if (free < 0 && (distribution.startsWith("safe") || SPACING.includes(mode))) return NOWHERE;
  const count = sizes.length;
  const shares: Record<string, { offset: number; extra: number }> = {
    center: { offset: free / 2, extra: 0 },
    end: { offset: free, extra: 0 },
    "flex-end": { offset: free, extra: 0 },
    right: { offset: free, extra: 0 },
    "space-between": { offset: 0, extra: count > 1 ? free / (count - 1) : 0 },
    "space-around": { offset: free / count / 2, extra: free / count },
    "space-evenly": { offset: free / (count + 1), extra: free / (count + 1) },
  };
  return Object.hasOwn(shares, mode) ? shares[mode] : NOWHERE;
}

export function findTrackLines(axis: TrackAxis): TrackLines {
  const { sizes, gap } = axis;
  if (!sizes.length) return { lines: [], gaps: [] };
  const { offset, extra } = distribute(axis);
  const starts: number[] = [];
  sizes.reduce((position, size) => {
    starts.push(position);
    return position + size + gap + extra;
  }, offset);
  const ends = sizes.map((size, index) => starts[index] + size);
  const gaps = ends.slice(0, -1).map((end, index) => ({ start: end, end: starts[index + 1] }));
  const middles = gaps.map(({ start, end }) => (start + end) / 2);
  return {
    lines: [starts[0], ...middles, ends[ends.length - 1]],
    gaps: gaps.filter(({ start, end }) => end > start),
  };
}
