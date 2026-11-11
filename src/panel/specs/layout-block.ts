/** The Layout block of the Specs tab: size, place, display, gap, radius, flex and grid controls. */
import { findBoardPosition } from "../../board";
import { h } from "../../dom";
import { createCell, createWideCell } from "./cell";
import { halfRowCells, type LayoutCell, wholeRowCells } from "./layout-cells";
import { createFlexControls, createGridControls } from "./flex-controls";
import { createSizeRow } from "./size-row";
import { addBlock } from "./specs-block";
import { findSpec, type SpecsContext } from "./specs-context";
import { createTokenNotes, type TokenSource } from "./token-notes";
import { createTracksRow } from "./tracks-row";

function createGrid2(cells: LayoutCell[], context: SpecsContext): HTMLElement {
  const grid = h("div", "grid2");
  const shown = cells.flatMap(({ label, value, prop }) =>
    value ? [createCell({ label, value, prop }, context)] : [],
  );
  grid.append(...shown);
  return grid;
}

function createTracksRows(context: SpecsContext): HTMLElement[] {
  return ["grid-template-columns", "grid-template-rows"].flatMap(
    (prop) => createTracksRow(context, prop) ?? [],
  );
}

function createWholeRowCells(cells: LayoutCell[], context: SpecsContext): HTMLElement[] {
  return cells.flatMap(({ label, value, prop }) =>
    value === undefined ? [] : [createWideCell({ label, value, prop }, context)],
  );
}

/** The flex or grid controls, and a grid's columns and rows. */
function createContainerControls(context: SpecsContext): HTMLElement[] {
  const { display } = context.computedStyle;
  if (display.includes("grid")) return [createGridControls(context), ...createTracksRows(context)];
  return display.includes("flex") ? [createFlexControls(context)] : [];
}

export function renderLayout(context: SpecsContext): void {
  const section = addBlock(context, {
    title: "Layout",
    note: findBoardPosition(context.element) ? "X, Y on board" : "",
  });
  section.appendChild(createSizeRow(context, findSpec(context, ["Layout", "size"])?.note ?? "hug × hug"));
  const cells = halfRowCells(context);
  const wideCells = wholeRowCells(context);
  section.appendChild(createGrid2(cells, context));
  section.append(...createContainerControls(context), ...createWholeRowCells(wideCells, context));
  const sources = [...cells, ...wideCells].map((cell): TokenSource => [cell.label, cell.spec]);
  section.append(...createTokenNotes(context, sources));
}
