/** Which of "fixed", "hug" and "fill" an element's width and height read as. */
import { declaredValue } from "../page-styles";
import type { SpecSubject } from "./spec";
import { type Axis, type Intent, type Placement, placementOf, STRETCHES } from "./sizing";

const BLOCK_LEVEL_DISPLAYS = ["block", "flex", "grid", "list-item", "table"];

const stretches = (self: string, items = ""): boolean => STRETCHES.includes(self === "auto" ? items : self);

/** An element, its placement and the declarations that apply to it. */
type IntentSubject = {
  computedStyle: CSSStyleDeclaration;
  styles: CSSStyleDeclaration[];
  placement: Placement;
};

/** As declared: the computed value of a side left to `auto` is a length. */
const isPinnedTo = (styles: CSSStyleDeclaration[], sides: string[]): boolean =>
  sides.every((side) => !["", "auto"].includes(declaredValue(styles, side)));

// Outside flex, a block-level box takes its container's width; in a grid,
// an item fills its cell on each axis unless it is placed in it.
function widthFillsByDefault({ computedStyle, styles, placement }: IntentSubject): boolean {
  if (placement.isOutOfFlow) return isPinnedTo(styles, ["left", "right"]);
  if (placement.isInGrid) return stretches(computedStyle.justifySelf, placement.parent?.justifyItems);
  return BLOCK_LEVEL_DISPLAYS.includes(computedStyle.display);
}

function heightFillsByDefault({ styles, placement }: IntentSubject, stretchesAcross: boolean): boolean {
  if (placement.isOutOfFlow) return isPinnedTo(styles, ["top", "bottom"]);
  return placement.isInGrid && stretchesAcross;
}

type AxisFacts = { prop: Axis; isMainAxis: boolean; fillsByDefault: boolean };

type IntentFacts = { subject: IntentSubject; stretchesAcross: boolean };

function axisIntent({ subject, stretchesAcross }: IntentFacts, axis: AxisFacts): Intent {
  const declared = declaredValue(subject.styles, axis.prop);
  if (declared === "100%") return "fill";
  // fit-content, max-content, min-content: the content decides.
  if (declared.includes("content")) return "hug";
  if (declared && declared !== "auto") return "fixed";
  if (subject.placement.isInFlex) {
    const grows = subject.computedStyle.flexGrow !== "0";
    return (axis.isMainAxis ? grows : stretchesAcross) ? "fill" : "hug";
  }
  return axis.fillsByDefault ? "fill" : "hug";
}

/**
 * "fill × hug": how the element gets its width and its height.
 *
 * shortcut: in a grid, an image or an element with an aspect ratio does not
 * stretch by default, and is still read as "fill"; upgrade if that misleads.
 */
export function sizingIntent({ element, computedStyle, stylesOf }: SpecSubject): string {
  const styles = stylesOf(element);
  const placement = placementOf(element, computedStyle);
  const subject = { computedStyle, styles, placement };
  const stretchesAcross = stretches(computedStyle.alignSelf, placement.parent?.alignItems);
  const facts = { subject, stretchesAcross };
  const width = axisIntent(facts, {
    prop: "width",
    isMainAxis: placement.isRowParent,
    fillsByDefault: widthFillsByDefault(subject),
  });
  const height = axisIntent(facts, {
    prop: "height",
    isMainAxis: placement.isInFlex && !placement.isRowParent,
    fillsByDefault: heightFillsByDefault(subject, stretchesAcross),
  });
  return `${width} × ${height}`;
}
