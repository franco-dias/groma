/** What the user has switched on in the panel. Modules read these when they render. */

import type { ColorFormat } from "./specs/color-format";

export type Unit = "px" | "rem";

/** "push": the panel takes its width out of the page. "float": it covers the page. */
export type PanelMode = "push" | "float";

type Options = {
  panelMode: PanelMode;
  unit: Unit;
  colorFormat: ColorFormat;
  gridStep: number;
  highlightPinned: boolean;
  hideDefaults: boolean;
  search: string;
  compareWith: Element | undefined;
  pickedColor: string;
};

export const options: Options = {
  /** Whether the side panel pushes the page aside or floats over it. */
  panelMode: "push",
  /** How the Specs tab shows and copies lengths. */
  unit: "px",
  /** How the Specs tab shows and copies colours. */
  colorFormat: "hex",
  /** Artboard pixels between grid lines; 0 turns the grid off. */
  gridStep: 0,
  /** Outline the pinned element on the page. */
  highlightPinned: true,
  /** All CSS tab: hide properties that still have their default value. */
  hideDefaults: true,
  /** All CSS tab: only show properties whose name contains this text. */
  search: "",
  /** Specs tab: the element the pinned one is compared with. */
  compareWith: undefined,
  /** Specs tab: the last colour taken with the eyedropper. */
  pickedColor: "",
};
