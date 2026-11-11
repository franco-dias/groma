/** Margin, border and padding: one number per side. */

export const SIDES = ["top", "right", "bottom", "left"] as const;
export type Side = (typeof SIDES)[number];
export type Sides = Record<Side, number>;

/** An element's margin, padding or border widths, in CSS pixels. */
export function sidesOf(
  computedStyle: CSSStyleDeclaration,
  property: "margin" | "padding" | "border",
): Sides {
  const suffix = property === "border" ? "-width" : "";
  const readSide = (name: Side): number =>
    parseFloat(computedStyle.getPropertyValue(`${property}-${name}${suffix}`)) || 0;
  return {
    top: readSide("top"),
    right: readSide("right"),
    bottom: readSide("bottom"),
    left: readSide("left"),
  };
}
