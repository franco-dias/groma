/**
 * The columns or rows of a grid, one size per track, so the Specs tab can
 * show each as a value to edit and count them.
 */
import type { Intent } from "./sizing";

/** Splits a track list at the spaces outside brackets: "1fr minmax(0, 2fr)" is two tracks. */
function split(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let part = "";
  const addChar = (char: string): void => {
    depth += bracketDepthChange(char);
    if (char !== " " || depth > 0) {
      part += char;
      return;
    }
    if (part) parts.push(part);
    part = "";
  };
  [...list.trim()].forEach(addChar);
  if (part) parts.push(part);
  return parts;
}

function bracketDepthChange(char: string): number {
  if ("([".includes(char)) return 1;
  return ")]".includes(char) ? -1 : 0;
}

/** `repeat(3, 1fr 2fr)`, with a plain number of times. */
const REPEAT = /^repeat\(\s*(\d+)\s*,(.*)\)$/;

const UNSUPPORTED_LIST = /\[|auto-fi|subgrid|masonry|var\(|^(none|inherit|initial|unset|revert(-layer)?)$/;

/**
 * The size of each track of a declared `grid-template-columns` or `-rows`,
 * with `repeat(3, 1fr)` written out. Undefined for a list that is not one size
 * per track: `none`, named lines, `auto-fill`, `subgrid`, a variable.
 */
export function parseTracks(declared: string): string[] | undefined {
  if (!declared || UNSUPPORTED_LIST.test(declared)) return undefined;
  const tracks = split(declared).flatMap(expandRepeat);
  return tracks.length ? tracks : undefined;
}

function expandRepeat(part: string): string[] {
  const [, times, inner] = REPEAT.exec(part) ?? [];
  return times ? Array.from({ length: Number(times) }, () => split(inner)).flat() : [part];
}

/** The track list for those sizes: `repeat(3, 1fr)` when they are all the same. */
export function formatTracks(tracks: string[]): string {
  const same = tracks.length > 1 && tracks.every((track) => track === tracks[0]);
  return same ? `repeat(${tracks.length}, ${tracks[0]})` : tracks.join(" ");
}

/** The sizes of the tracks the browser laid out, in pixels, from the computed track list. */
export const usedTracks = (computed: string): string[] =>
  computed === "none" ? [] : split(computed).filter((part) => !part.startsWith("["));

/** How many tracks the browser laid out. */
export const countTracks = (computed: string): number => usedTracks(computed).length;

/** A track's size in Figma's words: `auto` hugs, a share of the space (`fr`) fills. */
export function trackIntent(track: string): Intent {
  if (track.includes("fr")) return "fill";
  return track === "auto" || track.includes("content") ? "hug" : "fixed";
}

/** What each intent writes for a track; `used` is the track's size now, for "fixed". */
export function trackSize(intent: Intent, used: string): string {
  const sizes = { fill: "1fr", hug: "auto", fixed: used } satisfies Record<Intent, string>;
  return sizes[intent];
}

/** Layout snaps a size to a fraction of a pixel: "102.656px" is laid out as 102.641. */
function sizesMatch(tracks: string[], used: string[]): boolean {
  return tracks.every(
    (track, index) =>
      !/^[\d.]+px$/.test(track) || Math.abs(parseFloat(track) - parseFloat(used[index])) < 0.5,
  );
}

/**
 * Whether a declared list is the one the browser laid out: the same number
 * of tracks, and the sizes in pixels where the list gives them.
 *
 * shortcut: the declared value is the last one that applies by media query
 * and `@supports`, with selector specificity and `@container` ignored; this
 * turns down what the lookup still gets wrong (a different number of columns
 * per container size, a weaker rule that comes last), not every case. Upgrade
 * when the style lookup evaluates the cascade.
 */
export function tracksMatch(tracks: string[], used: string[]): boolean {
  return used.length === tracks.length && sizesMatch(tracks, used);
}

/** Like `tracksMatch` for rows, where a grid adds rows of its own: at least that many. */
export function tracksMatchAtLeast(tracks: string[], used: string[]): boolean {
  return used.length >= tracks.length && sizesMatch(tracks, used);
}

/** "span 2" or "1 / 3": the columns or rows a grid item takes; "" when the grid decides. */
export const gridPlacement = (value: string): string =>
  value.replace(/^auto( \/ auto)?$/, "").replace(/ \/ auto$/, "");
