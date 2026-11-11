/**
 * Sizing intent, in Figma's words: a fixed size, "hug" the content, or "fill"
 * the parent, and the declarations that give an axis one.
 */

export type Intent = "fixed" | "hug" | "fill";
export type Axis = "width" | "height";

/** What decides how an element can be sized along one axis. */
export type SizingContext = {
  /** The parent is a flex container. */
  isInFlex: boolean;
  /** The parent is a grid: the element is sized inside its cell. */
  isInGrid?: boolean;
  /** In a flex parent: the axis is the one the parent lays its items out along. */
  isMainAxis: boolean;
  /** The parent stretches its items on this axis: across a flex direction, or to their grid cell. */
  parentStretches: boolean;
};

/** The axis to size, how, and the element's size now (for "fixed"). */
export type SizingRequest = { axis: Axis; intent: Intent; size: string };

type Declaration = [prop: string, value: string];

export const STRETCHES = ["normal", "stretch", "legacy"];

/** Where an element sits in its parent's layout. */
export type Placement = {
  parent: CSSStyleDeclaration | undefined;
  isOutOfFlow: boolean;
  isInFlex: boolean;
  isInGrid: boolean;
  isRowParent: boolean;
};

export function placementOf(element: Element, computedStyle: CSSStyleDeclaration): Placement {
  const parent = element.parentElement ? getComputedStyle(element.parentElement) : undefined;
  // An element taken out of the flow is not an item of its parent's layout:
  // it is sized like a child of a block.
  const isOutOfFlow = ["absolute", "fixed"].includes(computedStyle.position);
  const isInFlex = !isOutOfFlow && parent?.display.includes("flex") === true;
  const isInGrid = !isOutOfFlow && parent?.display.includes("grid") === true;
  const isRowParent = isInFlex && parent?.flexDirection.startsWith("row") === true;
  return { parent, isOutOfFlow, isInFlex, isInGrid, isRowParent };
}

export function sizingContext(element: Element, axis: Axis): SizingContext {
  const { parent, isInFlex, isInGrid, isRowParent } = placementOf(element, getComputedStyle(element));
  // A grid places an item in its cell on both axes; flex only across its direction.
  const alignment = isInGrid && axis === "width" ? parent?.justifyItems : parent?.alignItems;
  return {
    isInFlex,
    isInGrid,
    isMainAxis: isInFlex && (axis === "width") === isRowParent,
    parentStretches: STRETCHES.includes(alignment ?? ""),
  };
}

/**
 * The declarations that give an axis a sizing intent, for an element in that
 * context. They are the ones `sizingIntent` reads back as the same intent.
 */
export function sizingDeclarations(request: SizingRequest, context: SizingContext): Declaration[] {
  const { axis, intent, size } = request;
  if (context.isInFlex && context.isMainAxis) return mainAxisDeclarations(request);
  if (intent === "fixed") return [[axis, size]];
  if (context.isInFlex || context.isInGrid) return crossAxisDeclarations(request, context);
  return [[axis, intent === "fill" ? "100%" : "fit-content"]];
}

// Along the parent's direction, growing is what fills. An item that does
// not grow takes its size from the property only with a basis of `auto`:
// `flex: 1` sets the basis to 0, which would shrink it to nothing.
function mainAxisDeclarations({ axis, intent, size }: SizingRequest): Declaration[] {
  const grow: Declaration = ["flex-grow", intent === "fill" ? "1" : "0"];
  const own: Declaration = [axis, intent === "fixed" ? size : "auto"];
  return intent === "fill" ? [own, grow] : [own, grow, ["flex-basis", "auto"]];
}

// Across a flex direction, and in a grid cell, stretching is what fills.
// "auto" follows a parent that does not stretch.
function crossAxisDeclarations(
  { axis, intent }: SizingRequest,
  { isInGrid, parentStretches }: SizingContext,
): Declaration[] {
  const start = isInGrid ? "start" : "flex-start";
  const selfProp = isInGrid && axis === "width" ? "justify-self" : "align-self";
  const unstretched = parentStretches ? start : "auto";
  return [
    [axis, "auto"],
    [selfProp, intent === "fill" ? "stretch" : unstretched],
  ];
}
