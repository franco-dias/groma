/** Sizing intent, in Figma's words: a fixed size, "hug" the content, or "fill" the parent. */
import { declaredValue } from "../page-styles";

export type Intent = "fixed" | "hug" | "fill";
export type Axis = "width" | "height";

/** What decides how an element can be sized along one axis. */
export interface SizingContext {
  /** The parent is a flex container. */
  inFlex: boolean;
  /** The parent is a grid: the element is sized inside its cell. */
  inGrid?: boolean;
  /** In a flex parent: the axis is the one the parent lays its items out along. */
  isMainAxis: boolean;
  /** The parent stretches its items on this axis: across a flex direction, or to their grid cell. */
  parentStretches: boolean;
}

const STRETCHES = ["normal", "stretch", "legacy"];

export function sizingContext(el: Element, axis: Axis): SizingContext {
  const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
  // An element taken out of the flow is sized like a child of a block.
  const inFlow = !["absolute", "fixed"].includes(getComputedStyle(el).position);
  const inFlex = inFlow && parent !== null && parent.display.includes("flex");
  const inGrid = inFlow && parent !== null && parent.display.includes("grid");
  const rowParent = inFlex && parent.flexDirection.startsWith("row");
  // A grid places an item in its cell on both axes; flex only across its direction.
  const alignment = inGrid && axis === "width" ? parent.justifyItems : parent?.alignItems;
  return {
    inFlex,
    inGrid,
    isMainAxis: inFlex && (axis === "width") === rowParent,
    parentStretches: STRETCHES.includes(alignment ?? ""),
  };
}

/**
 * The declarations that give an axis a sizing intent, for an element in that
 * context. `size` is the element's size now, for "fixed". They are the ones
 * `sizingIntent` reads back as the same intent.
 */
export function sizingDeclarations(
  axis: Axis,
  intent: Intent,
  size: string,
  { inFlex, inGrid, isMainAxis, parentStretches }: SizingContext,
): [prop: string, value: string][] {
  if (inFlex && isMainAxis) {
    // Along the parent's direction, growing is what fills. An item that does
    // not grow takes its size from the property only with a basis of `auto`:
    // `flex: 1` sets the basis to 0, which would shrink it to nothing.
    const grow: [string, string] = ["flex-grow", intent === "fill" ? "1" : "0"];
    const own: [string, string] = [axis, intent === "fixed" ? size : "auto"];
    return intent === "fill" ? [own, grow] : [own, grow, ["flex-basis", "auto"]];
  }
  if (intent === "fixed") return [[axis, size]];
  if (inFlex || inGrid) {
    // Across a flex direction, and in a grid cell, stretching is what fills.
    // "auto" follows a parent that does not stretch.
    const start = inGrid ? "start" : "flex-start";
    return [
      [axis, "auto"],
      [inGrid && axis === "width" ? "justify-self" : "align-self", intent === "fill" ? "stretch" : parentStretches ? start : "auto"],
    ];
  }
  return [[axis, intent === "fill" ? "100%" : "fit-content"]];
}

/**
 * "fill × hug": how the element gets its width and its height.
 *
 * shortcut: in a grid, an image or an element with an aspect ratio does not
 * stretch by default, and is still read as "fill"; upgrade if that misleads.
 */
export function sizingIntent(
  el: Element,
  cs: CSSStyleDeclaration,
  styles: CSSStyleDeclaration[],
): string {
  const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
  // An element taken out of the flow is not an item of its parent's layout:
  // it fills an axis when it is pinned to both of its sides.
  const outOfFlow = ["absolute", "fixed"].includes(cs.position);
  // As declared: the computed value of a side left to `auto` is a length.
  const pinnedTo = (...sides: string[]): boolean =>
    sides.every((side) => !["", "auto"].includes(declaredValue(styles, side)));
  const inFlex = !outOfFlow && parent !== null && parent.display.includes("flex");
  const inGrid = !outOfFlow && parent !== null && parent.display.includes("grid");
  const rowParent = inFlex && parent.flexDirection.startsWith("row");
  const grows = cs.flexGrow !== "0";
  const stretches = (self: string, items = ""): boolean => STRETCHES.includes(self === "auto" ? items : self);
  const stretchesAcross = stretches(cs.alignSelf, parent?.alignItems);

  const intent = (prop: string, isMainAxis: boolean, fillsByDefault: boolean): Intent => {
    const declared = declaredValue(styles, prop);
    if (declared === "100%") return "fill";
    // fit-content, max-content, min-content: the content decides.
    if (declared.includes("content")) return "hug";
    if (declared && declared !== "auto") return "fixed";
    if (inFlex) return (isMainAxis ? grows : stretchesAcross) ? "fill" : "hug";
    return fillsByDefault ? "fill" : "hug";
  };

  // Outside flex, a block-level box takes its container's width; in a grid,
  // an item fills its cell on each axis unless it is placed in it.
  const blockLevel = ["block", "flex", "grid", "list-item", "table"].includes(cs.display);
  const fillsWidth = outOfFlow
    ? pinnedTo("left", "right")
    : inGrid
      ? stretches(cs.justifySelf, parent?.justifyItems)
      : blockLevel;
  const width = intent("width", rowParent, fillsWidth);
  const height = intent("height", inFlex && !rowParent, outOfFlow ? pinnedTo("top", "bottom") : inGrid && stretchesAcross);
  return `${width} × ${height}`;
}
