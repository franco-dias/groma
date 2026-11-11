/** The Box block of the Specs tab: margin around padding around the content size, as nested boxes. */
import { SIDES, type Sides, sidesOf } from "../../box-sides";
import { h, layoutSize, roundToHundredth } from "../../dom";
import { copiedSpacing, compactSides, type SpacingName } from "../../specs/units";
import { copyOnClick } from "../copy";
import { copied, lengthCopy, shown } from "./display";
import { editable } from "./editable-field";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

const sidesInPixels = (sides: Sides): number[] => SIDES.map((side) => roundToHundredth(sides[side]));

/** A ring of the box: margin or padding, and its four sides. */
type Ring = { name: SpacingName; sides: Sides };

/** The four numbers of one ring, each on its own side; a click copies it, a double-click edits it. */
function createBoxSides({ name, sides }: Ring, context: SpecsContext): HTMLElement[] {
  return SIDES.map((side) => {
    const value = `${roundToHundredth(sides[side])}px`;
    const node = copyOnClick(h("span", `box-side is-${side}`, shown(value)), copied(value));
    return editable(node, { context, prop: `${name}-${side}`, value });
  });
}

/** The name of a ring: a click copies its four sides, a double-click edits them at once. */
function createRingName({ name, sides }: Ring, context: SpecsContext): HTMLElement {
  const spacing = (): string => copiedSpacing({ name, sides: sidesInPixels(sides) }, lengthCopy());
  const node = copyOnClick(h("span", "box-name", name), spacing);
  const value = compactSides(sidesInPixels(sides).map((side) => `${side}px`));
  editable(node, { context, prop: name, value });
  node.title = "Click to copy all four sides · double-click to edit them at once";
  return node;
}

function createRing(
  { className, ...ring }: Ring & { className: string },
  context: SpecsContext,
): HTMLElement {
  const box = h("div", className);
  box.append(createRingName(ring, context), ...createBoxSides(ring, context));
  return box;
}

/** The content size: the element's size without its padding and border. */
function contentSize(context: SpecsContext): string {
  const { element, computedStyle } = context;
  const padding = sidesOf(computedStyle, "padding");
  const border = sidesOf(computedStyle, "border");
  const size = layoutSize(element, element.getBoundingClientRect());
  const width = size.width - padding.left - padding.right - border.left - border.right;
  const height = size.height - padding.top - padding.bottom - border.top - border.bottom;
  return `${roundToHundredth(width)} × ${roundToHundredth(height)}`;
}

export function renderBox(context: SpecsContext): void {
  const { computedStyle } = context;
  const section = addBlock(context, { title: "Box", note: computedStyle.boxSizing });
  // Which box `width` and `height` set: it explains a size field that holds
  // less than the size shown, and it can be changed like any other value.
  // An element the page has just removed has no styles, and so no note.
  const sizing = section.querySelector<HTMLElement>(".note");
  if (sizing) {
    const value = computedStyle.boxSizing;
    editable(copyOnClick(sizing, value), { context, prop: "box-sizing", value });
  }
  const marginBox = section.appendChild(
    createRing({ name: "margin", sides: sidesOf(computedStyle, "margin"), className: "box-margin" }, context),
  );
  const paddingBox = marginBox.appendChild(
    createRing(
      { name: "padding", sides: sidesOf(computedStyle, "padding"), className: "box-padding" },
      context,
    ),
  );
  paddingBox.appendChild(h("div", "box-content", contentSize(context)));
}
