/**
 * The columns or the rows of a grid: how many there are, with − and + to
 * drop or repeat the last one, then each track's size. A double-click on a
 * size edits it; the drawing before it says whether the track is fixed, hugs
 * or fills, and a click changes that. Every change is one edit of the whole
 * list.
 *
 * A list that is not one size per track (`auto-fill`, named lines) is one
 * value to edit as text, beside the number of tracks the browser laid out.
 * Rows are shown only when the page declares them.
 */
import { h } from "../../dom";
import { declaredValue } from "../../page-styles";
import { parseTracks, tracksMatch, tracksMatchAtLeast, usedTracks } from "../../specs/tracks";
import { copyOnClick } from "../copy";
import { editable } from "./editable-field";
import type { SpecsContext } from "./specs-context";
import { createTrackChip } from "./track-chip";
import { setTracks, type TrackList } from "./track-list";

/** More equal tracks than this are shown as one size, "each". */
const MANY_TRACKS = 4;

function createStep(list: TrackList, step: { sign: string; label: string; next: string[] }): HTMLElement {
  const button = h("button", "step", step.sign);
  button.title = button.ariaLabel = step.label;
  button.disabled = !step.next.length;
  button.addEventListener("click", () => setTracks(list, step.next));
  return button;
}

function createStepper(list: TrackList): HTMLElement {
  const { tracks, noun } = list;
  const stepper = h("span", "stepper");
  stepper.append(
    createStep(list, { sign: "−", label: `Remove the last ${noun}`, next: tracks.slice(0, -1) }),
    h("span", "track-count", String(tracks.length)),
    createStep(list, {
      sign: "+",
      label: `Add a ${noun} like the last one`,
      next: [...tracks, tracks.at(-1) ?? ""],
    }),
  );
  return stepper;
}

function createTrackList(list: TrackList): HTMLElement {
  const { tracks } = list;
  const element = h("div", "track-list");
  element.appendChild(createStepper(list));
  // Many equal tracks (a 12-column grid) are one size to read and to change.
  const isEach = tracks.length > MANY_TRACKS && tracks.every((track) => track === tracks[0]);
  const shownTracks = isEach ? tracks.slice(0, 1) : tracks;
  element.append(...shownTracks.map((_, index) => createTrackChip(list, { index, isEach })));
  return element;
}

/** A list that is not one size per track: one value to edit as text, and how many tracks were laid out. */
function addPlainTracks(
  row: HTMLElement,
  plain: { context: SpecsContext; prop: string; text: string; laidOut: number },
): void {
  const { context, prop, text, laidOut } = plain;
  editable(copyOnClick(row.appendChild(h("span", "value", text)), text), { context, prop, value: text });
  row.appendChild(h("span", "hint", `${laidOut} laid out`));
}

/** What the page declares for the tracks, and what the browser laid out. */
type TrackFacts = { declared: string; computed: string; used: string[]; isUndeclared: boolean };

function readTrackFacts(context: SpecsContext, prop: string): TrackFacts {
  const declared = declaredValue(context.stylesOf(context.element), prop);
  const computed = context.computedStyle.getPropertyValue(prop);
  return { declared, computed, used: usedTracks(computed), isUndeclared: !declared || declared === "none" };
}

export function createTracksRow(context: SpecsContext, prop: string): HTMLElement | undefined {
  const isRows = prop.endsWith("rows");
  const { declared, computed, used, isUndeclared } = readTrackFacts(context, prop);
  // Tracks the grid makes by itself are not the design's to count: its rows,
  // and the one column of a grid that declares none. (Several columns with no
  // declaration to read come from a stylesheet of another site.)
  if (isUndeclared && (isRows || used.length < 2)) return undefined;

  const row = h("div", "wide tracks");
  row.dataset.prop = prop;
  row.appendChild(h("span", "label", isRows ? "Rows" : "Columns"));
  const parsed = parseTracks(declared);
  const matches = isRows ? tracksMatchAtLeast : tracksMatch;
  if (!parsed || !matches(parsed, used)) {
    const text = isUndeclared ? computed : declared;
    addPlainTracks(row, { context, prop, text, laidOut: used.length });
    return row;
  }
  row.appendChild(
    createTrackList({ context, prop, row, tracks: parsed, used, noun: isRows ? "row" : "column" }),
  );
  return row;
}
