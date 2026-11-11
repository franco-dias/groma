/** One track of a grid: the drawing that says whether it is fixed, hugs or fills, and its size to edit. */
import { h } from "../../dom";
import { type Intent, intentGlyph } from "../../icons";
import { rerender } from "../../selection";
import { formatTracks, trackIntent, trackSize } from "../../specs/tracks";
import { copyOnClick } from "../copy";
import { copied, shown } from "./display";
import { editable } from "./editable-field";
import { type MenuItem, toggleMenu } from "./row-menu";
import { setTracks, type TrackList } from "./track-list";

const TRACK_INTENTS: [intent: Intent, meaning: string][] = [
  ["fixed", "a set size"],
  ["hug", "auto: as big as its content"],
  ["fill", "1fr: a share of the space left"],
];

const INTENT_WORDS: Record<Intent, string> = { fixed: "fixed", hug: "hugging", fill: "filling" };

/** One track, and whether it stands for a run of equal tracks. */
export type TrackChip = { index: number; isEach: boolean };

/** A size for a track. */
type TrackChange = TrackChip & { size: string };

/** What a change to this size gives the list: every track, or this one. */
function withSize({ tracks }: TrackList, { index, isEach, size }: TrackChange): string[] {
  return isEach ? tracks.map(() => size) : tracks.toSpliced(index, 1, ...(size ? [size] : []));
}

function createIntentItems(list: TrackList, chip: TrackChip): MenuItem[] {
  const now = trackIntent(list.tracks[chip.index]);
  const pick = (value: Intent): (() => void) => {
    if (value === now) return rerender;
    const size = trackSize(value, list.used[chip.index]);
    return () => setTracks(list, withSize(list, { ...chip, size }));
  };
  return TRACK_INTENTS.map(([value, hint]) => ({
    value,
    glyph: intentGlyph(value),
    hint,
    checked: value === now,
    pick: pick(value),
  }));
}

function createIntentButton(list: TrackList, chip: TrackChip): HTMLElement {
  const now = trackIntent(list.tracks[chip.index]);
  const intent = h("button", "intent");
  intent.appendChild(intentGlyph(now));
  intent.title = intent.ariaLabel = `This ${list.noun} is ${INTENT_WORDS[now]}. Click to change it`;
  intent.setAttribute("aria-haspopup", "menu");
  intent.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(list.row, { name: `${list.prop}:${chip.index}`, items: createIntentItems(list, chip) });
  });
  return intent;
}

function createTrackSize(list: TrackList, chip: TrackChip): HTMLElement {
  const track = list.tracks[chip.index];
  // A size inside a function keeps its unit: "minmax(100, 1fr)" is not CSS.
  const isPlain = !track.includes("(");
  const size = copyOnClick(
    h("span", "value", isPlain ? shown(track) : track),
    isPlain ? copied(track) : track,
  );
  // An emptied field takes the track away.
  const whole = (typed: string): string => formatTracks(withSize(list, { ...chip, size: typed }));
  editable(size, { context: list.context, prop: list.prop, value: track, whole });
  size.dataset.track = String(chip.index);
  return size;
}

export function createTrackChip(list: TrackList, chip: TrackChip): HTMLElement {
  const element = h("span", "track");
  element.append(createIntentButton(list, chip), createTrackSize(list, chip));
  if (chip.isEach) element.appendChild(h("span", "hint", "each"));
  return element;
}
