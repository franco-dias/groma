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
  for (const char of list.trim()) {
    if ("([".includes(char)) depth++;
    if (")]".includes(char)) depth--;
    if (char === " " && depth === 0) {
      if (part) parts.push(part);
      part = "";
    } else part += char;
  }
  if (part) parts.push(part);
  return parts;
}

/** `repeat(3, 1fr 2fr)`, with a plain number of times. */
const REPEAT = /^repeat\(\s*(\d+)\s*,(.*)\)$/;

/**
 * The size of each track of a declared `grid-template-columns` or `-rows`,
 * with `repeat(3, 1fr)` written out. Null for a list that is not one size per
 * track: `none`, named lines, `auto-fill`, `subgrid`, a variable.
 */
export function parseTracks(declared: string): string[] | null {
  if (!declared || /\[|auto-fi|subgrid|masonry|var\(|^(none|inherit|initial|unset|revert(-layer)?)$/.test(declared)) return null;
  const tracks = split(declared).flatMap((part) => {
    const [, times, inner] = REPEAT.exec(part) ?? [];
    return times ? Array.from({ length: Number(times) }, () => split(inner)).flat() : [part];
  });
  return tracks.length ? tracks : null;
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
export const trackSize = (intent: Intent, used: string): string =>
  intent === "fill" ? "1fr" : intent === "hug" ? "auto" : used;

/**
 * Whether a declared list is the one the browser laid out: the same number
 * of tracks (`atLeast` for rows, where a grid adds its own), and the sizes in
 * pixels where the list gives them.
 *
 * shortcut: the declared value is the last one in the stylesheets, even from
 * a media query that does not apply now; this turns down the common case (a
 * different number of columns per breakpoint), not every one. Upgrade when
 * the page's style lookup knows which media queries match.
 */
export function tracksMatch(tracks: string[], used: string[], atLeast: boolean): boolean {
  const count = atLeast ? used.length >= tracks.length : used.length === tracks.length;
  // Layout snaps a size to a fraction of a pixel: "102.656px" is laid out as 102.641.
  return count && tracks.every((track, i) => !/^[\d.]+px$/.test(track) || Math.abs(parseFloat(track) - parseFloat(used[i])) < 0.5);
}
