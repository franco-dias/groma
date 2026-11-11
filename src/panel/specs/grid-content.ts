/** Which of a grid's Distribute rows to show: when its tracks leave room on that axis, or the property is set. */
import { readGridAxes } from "../../grid-axes";
import { freeSpace } from "../../specs/track-lines";
import { type FlexControl, GRID_CONTENT_CONTROLS } from "./flex-choices";
import type { SpecsContext } from "./specs-context";

/** Room of less than this is the tracks filling the container, to the pixel. */
const ROOM_PX = 1;

export function findContentControls({ element, computedStyle }: SpecsContext): FlexControl[] {
  const { columns, rows } = readGridAxes(element);
  const isShown = ({ prop }: FlexControl): boolean => {
    const axis = prop === "justify-content" ? columns : rows;
    return freeSpace(axis) >= ROOM_PX || computedStyle.getPropertyValue(prop) !== "normal";
  };
  return GRID_CONTENT_CONTROLS.filter(isShown);
}
