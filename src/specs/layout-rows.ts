/** The Layout section of the Specs tab: size, place, spacing, flex, grid and position. */
import { findBoardPosition } from "../board";
import { SIDES } from "../box-sides";
import { layoutSize } from "../dom";
import { sizingIntent } from "./sizing-intent";
import { type Spec, type SpecSubject, sideProps, sidesText, unlessDefault } from "./spec";

export function layoutRows(subject: SpecSubject): Spec[] {
  const { computedStyle } = subject;
  const isFlex = computedStyle.display.includes("flex");
  const isGrid = computedStyle.display.includes("grid");
  return [
    ...boxRows(subject),
    ...(isFlex ? flexRows(computedStyle) : []),
    ...(isGrid ? gridRows(computedStyle) : []),
    ...(isFlex || isGrid ? gapRows(computedStyle) : []),
    ...positionRows(computedStyle),
  ];
}

function sizeRows(subject: SpecSubject): Spec[] {
  const { element } = subject;
  const size = layoutSize(element, element.getBoundingClientRect());
  const onBoard = findBoardPosition(element);
  return [
    {
      name: "size",
      value: `${size.width} × ${size.height}`,
      props: ["width", "height"],
      note: sizingIntent(subject),
    },
    { name: "on board", value: onBoard?.text ?? "", note: onBoard?.board },
  ];
}

function boxRows(subject: SpecSubject): Spec[] {
  const { computedStyle } = subject;
  return [
    ...sizeRows(subject),
    {
      name: "padding",
      value: unlessDefault(sidesText(computedStyle, "padding"), "0px"),
      props: sideProps("padding"),
    },
    {
      name: "margin",
      value: unlessDefault(sidesText(computedStyle, "margin"), "0px"),
      props: sideProps("margin"),
    },
  ];
}

function flexRows(computedStyle: CSSStyleDeclaration): Spec[] {
  const wrap = computedStyle.flexWrap === "nowrap" ? "" : " wrap";
  return [
    { name: "layout", value: `flex ${computedStyle.flexDirection}${wrap}` },
    { name: "align", value: unlessDefault(computedStyle.alignItems, "normal") },
    { name: "justify", value: unlessDefault(computedStyle.justifyContent, "normal") },
  ];
}

function gridRows(computedStyle: CSSStyleDeclaration): Spec[] {
  return [
    { name: "layout", value: "grid" },
    { name: "columns", value: unlessDefault(computedStyle.gridTemplateColumns, "none") },
  ];
}

function gapRows(computedStyle: CSSStyleDeclaration): Spec[] {
  return [
    {
      name: "gap",
      value: unlessDefault(computedStyle.gap, "normal", "0px"),
      props: ["gap", "row-gap", "column-gap"],
    },
  ];
}

function positionRows(computedStyle: CSSStyleDeclaration): Spec[] {
  if (computedStyle.position === "static") return [];
  const insets = SIDES.filter((side) => computedStyle.getPropertyValue(side) !== "auto").map(
    (side) => `${side} ${computedStyle.getPropertyValue(side)}`,
  );
  return [{ name: "position", value: [computedStyle.position, ...insets].join(" · ") }];
}
