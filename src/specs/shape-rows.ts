/** The Shape section of the Specs tab: background, border, radius, shadow and opacity. */
import { type Spec, sideProps, sidesText, unlessDefault } from "./spec";
import { compactSides } from "./units";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

export function shapeRows(computedStyle: CSSStyleDeclaration): Spec[] {
  return [...backgroundRows(computedStyle), ...borderRows(computedStyle), ...effectRows(computedStyle)];
}

function backgroundRows(computedStyle: CSSStyleDeclaration): Spec[] {
  return [
    {
      name: "background",
      value: unlessDefault(computedStyle.backgroundColor, TRANSPARENT),
      color: true,
      props: ["background-color", "background"],
    },
    {
      name: "gradient",
      value: unlessDefault(computedStyle.backgroundImage, "none"),
      props: ["background-image", "background"],
    },
  ];
}

function borderRows(computedStyle: CSSStyleDeclaration): Spec[] {
  const borderWidths = sidesText(computedStyle, "border");
  const hasBorder = borderWidths !== "0px";
  return [
    {
      name: "border",
      value: hasBorder ? `${borderWidths} ${computedStyle.borderTopStyle}` : "",
      props: ["border-width", "border", ...sideProps("border")],
    },
    {
      name: "border color",
      value: hasBorder ? computedStyle.borderTopColor : "",
      color: true,
      props: ["border-color", "border", ...sideProps("border"), "border-top-color"],
    },
  ];
}

function effectRows(computedStyle: CSSStyleDeclaration): Spec[] {
  const radius = compactSides([
    computedStyle.borderTopLeftRadius,
    computedStyle.borderTopRightRadius,
    computedStyle.borderBottomRightRadius,
    computedStyle.borderBottomLeftRadius,
  ]);
  return [
    { name: "radius", value: unlessDefault(radius, "0px"), props: ["border-radius"] },
    { name: "shadow", value: unlessDefault(computedStyle.boxShadow, "none"), props: ["box-shadow"] },
    { name: "opacity", value: unlessDefault(computedStyle.opacity, "1"), props: ["opacity"] },
  ];
}
