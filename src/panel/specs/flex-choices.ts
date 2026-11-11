/** The buttons of a flex or grid container's controls: what each draws, and the values it stands for. */
import type { FlexGlyph } from "../../icons";

/** One choice of a flex control: its drawing, and the values of the property it stands for. */
export type FlexChoice = [glyph: FlexGlyph, value: string, ...alsoWhen: string[]];

export type FlexControl = {
  label: string;
  prop: string;
  /** Said beside the buttons, so "align" and "justify" are never a guess. */
  axis: string;
  choices: FlexChoice[];
  /** Values that share one last button, which opens them as a menu. */
  more?: FlexChoice[];
};

/** Start, centre, end or stretch: where a container puts an item on one axis. */
const PLACES: FlexChoice[] = [
  ["start", "start", "flex-start", "left"],
  ["center", "center"],
  ["end", "end", "flex-end", "right"],
  ["stretch", "stretch", "normal", "legacy"],
];

/** A grid places each item inside its cell, on both axes. */
export const GRID_CONTROLS: FlexControl[] = [
  { label: "Justify", prop: "justify-items", axis: "across each cell", choices: PLACES },
  { label: "Align", prop: "align-items", axis: "down each cell", choices: PLACES },
];

export const FLEX_CONTROLS: FlexControl[] = [
  {
    label: "Direction",
    prop: "flex-direction",
    axis: "",
    choices: [
      ["row", "row"],
      ["row", "column"],
    ],
  },
  {
    label: "Justify",
    prop: "justify-content",
    axis: "along the direction",
    choices: [
      ["start", "flex-start", "normal", "start", "left"],
      ["center", "center"],
      ["end", "flex-end", "end", "right"],
    ],
    // Ways to share out the space between the items: one button, three values.
    more: [
      ["between", "space-between"],
      ["around", "space-around"],
      ["evenly", "space-evenly"],
    ],
  },
  {
    label: "Align",
    prop: "align-items",
    axis: "across the direction",
    choices: [
      ["start", "flex-start", "start"],
      ["center", "center"],
      ["end", "flex-end", "end"],
      ["stretch", "stretch", "normal"],
    ],
  },
];
