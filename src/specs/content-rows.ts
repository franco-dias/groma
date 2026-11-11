/** The Text, Icon and Motion sections of the Specs tab: what an element shows and how it moves. */
import { hasValue } from "../edits/content-overrides";
import { motionItems } from "./motion";
import { type Spec, unlessDefault } from "./spec";

function hasText(element: Element): boolean {
  if (hasValue(element)) return true;
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim(),
  );
}

export function textRows(element: Element, computedStyle: CSSStyleDeclaration): Spec[] {
  if (!hasText(element)) return [];
  const family = computedStyle.fontFamily.split(",")[0].replaceAll('"', "");
  return [
    {
      name: "font",
      value: `${family} ${computedStyle.fontWeight} ${computedStyle.fontSize}/${computedStyle.lineHeight}`,
      props: ["font", "font-family", "font-weight", "font-size", "line-height"],
    },
    { name: "color", value: computedStyle.color, color: true, props: ["color"] },
    {
      name: "spacing",
      value: unlessDefault(computedStyle.letterSpacing, "normal", "0px"),
      props: ["letter-spacing"],
    },
    { name: "transform", value: unlessDefault(computedStyle.textTransform, "none") },
    { name: "align", value: unlessDefault(computedStyle.textAlign, "start", "left") },
    { name: "decoration", value: unlessDefault(computedStyle.textDecorationLine, "none") },
  ];
}

export function iconRows(element: Element, computedStyle: CSSStyleDeclaration): Spec[] {
  // Not `instanceof SVGElement`: that is false for the elements of a frame.
  if (!("ownerSVGElement" in element)) return [];
  return [
    { name: "fill", value: unlessDefault(computedStyle.fill, "none"), color: true, props: ["fill", "color"] },
    {
      name: "stroke",
      value: unlessDefault(computedStyle.stroke, "none"),
      color: true,
      props: ["stroke", "color"],
    },
    {
      name: "stroke width",
      value: computedStyle.stroke === "none" ? "" : computedStyle.strokeWidth,
      props: ["stroke-width"],
    },
  ];
}

export function motionRows(computedStyle: CSSStyleDeclaration): Spec[] {
  return motionItems(computedStyle).map((item) => ({
    name: item.property,
    value: `${item.duration} ${item.easing}`,
  }));
}
