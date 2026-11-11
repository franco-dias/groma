/** The values of the Specs tab's Layout block: half a row each, or a whole row for the long ones. */
import { findBoardPosition } from "../../board";
import type { Spec } from "../../specs/spec";
import { gridPlacement } from "../../specs/tracks";
import { findSpec, type SpecAddress, type SpecsContext } from "./specs-context";

/**
 * A value of the block: its label, the text, the spec it comes from (for its
 * tokens), and the CSS property a double-click edits. A value made of several
 * properties (the position on the board, a border's widths and style,
 * "absolute · top 8px") has no property, and only copies.
 */
export type LayoutCell = { label: string; value: string | undefined; spec?: Spec; prop?: string };

export function halfRowCells(context: SpecsContext): LayoutCell[] {
  return [...positionCells(context), ...displayCells(context), ...shapeCells(context)];
}

function positionCells(context: SpecsContext): LayoutCell[] {
  const onBoard = findBoardPosition(context.element);
  return [
    { label: "X", value: onBoard ? String(onBoard.x) : "" },
    { label: "Y", value: onBoard ? String(onBoard.y) : "" },
  ];
}

function displayCells(context: SpecsContext): LayoutCell[] {
  const { computedStyle } = context;
  const gap = findSpec(context, ["Layout", "gap"]);
  return [
    { label: "Display", value: computedStyle.display, prop: "display" },
    { label: "Gap", value: gap?.value, spec: gap, prop: "gap" },
    // Where a grid item is placed, when it is not left to the grid.
    {
      label: "Column",
      value: gridPlacement(computedStyle.getPropertyValue("grid-column")),
      prop: "grid-column",
    },
    { label: "Row", value: gridPlacement(computedStyle.getPropertyValue("grid-row")), prop: "grid-row" },
  ];
}

function shapeCells(context: SpecsContext): LayoutCell[] {
  const radius = findSpec(context, ["Shape", "radius"]);
  const border = findSpec(context, ["Shape", "border"]);
  const opacity = findSpec(context, ["Shape", "opacity"]);
  const stroke = findSpec(context, ["Icon", "stroke width"]);
  return [
    { label: "Radius", value: radius?.value, spec: radius, prop: "border-radius" },
    { label: "Border", value: border?.value, spec: border },
    { label: "Opacity", value: opacity?.value, spec: opacity, prop: "opacity" },
    { label: "Stroke", value: stroke?.value, spec: stroke, prop: "stroke-width" },
  ];
}

/** Values too long for half a row. */
export function wholeRowCells(context: SpecsContext): LayoutCell[] {
  const cell = ({
    label,
    address,
    prop,
  }: {
    label: string;
    address: SpecAddress;
    prop?: string;
  }): LayoutCell => {
    const spec = findSpec(context, address);
    return { label, value: spec?.value, spec, prop };
  };
  return [
    cell({ label: "Position", address: ["Layout", "position"] }),
    cell({ label: "Shadow", address: ["Shape", "shadow"], prop: "box-shadow" }),
    cell({ label: "Gradient", address: ["Shape", "gradient"], prop: "background-image" }),
  ];
}
