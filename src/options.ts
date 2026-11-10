/** What the user has switched on in the panel. Modules read these when they render. */

export type Unit = "px" | "rem";

export const options = {
  /** How the Specs tab shows and copies lengths. */
  unit: "px" as Unit,
  /** Artboard pixels between grid lines; 0 turns the grid off. */
  gridStep: 0,
  /** Outline the pinned element on the page. */
  highlightPinned: true,
  /** All CSS tab: hide properties that still have their default value. */
  hideDefaults: true,
  /** All CSS tab: only show properties whose name contains this text. */
  search: "",
  /** Specs tab: the element the pinned one is compared with. */
  compareWith: null as Element | null,
  /** Specs tab: the last colour taken with the eyedropper. */
  pickedColor: "",
};
