/** The tracks of a grid's columns or rows, and the one edit that changes them. */
import { edit } from "../../edits/changes";
import { rerender } from "../../selection";
import { formatTracks } from "../../specs/tracks";
import type { SpecsContext } from "./specs-context";

/** The grid's tracks as the page declares them, as the browser laid them out, and where they show. */
export type TrackList = {
  context: SpecsContext;
  prop: string;
  row: HTMLElement;
  tracks: string[];
  used: string[];
  noun: "row" | "column";
};

export function setTracks({ context, prop }: TrackList, next: string[]): void {
  edit({ selector: context.selector, prop, value: formatTracks(next), element: context.element });
  rerender();
}
