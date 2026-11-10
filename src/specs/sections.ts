/**
 * What a developer needs to build an element, grouped the way the Specs tab
 * shows it: layout, shape, text, icon, motion.
 */
import { boardPosition } from "../board";
import { SIDES, sidesOf } from "../box-sides";
import { layoutSize } from "../dom";
import { hasValue } from "../edits/overrides";
import type { StyleLookup } from "../page-styles";
import { motionItems } from "./motion";
import { sizingIntent } from "./sizing";
import { compactSides } from "./units";

export interface Spec {
  name: string;
  /** Empty when there is nothing to show; such rows are skipped. */
  value: string;
  /** The value is a colour: show a swatch and look for tokens with that colour. */
  color?: boolean;
  /** CSS properties to look up design tokens for. */
  props?: string[];
  /** Extra information shown beside the value. */
  note?: string;
}

export interface SpecSection {
  label: string;
  rows: Spec[];
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

/** "" when `value` is one of the defaults, so the row is skipped. */
const unless = (value: string, ...defaults: string[]): string =>
  defaults.includes(value) ? "" : value;

/** A property and its four per-side longhands. */
const sideProps = (name: string): string[] => [name, ...SIDES.map((side) => `${name}-${side}`)];

/** "24px" or "12px 16px": the sides of margin, padding or border, shortest form. */
function sidesText(cs: CSSStyleDeclaration, property: "margin" | "padding" | "border"): string {
  const sides = sidesOf(cs, property);
  return compactSides(SIDES.map((side) => `${sides[side]}px`));
}

function layoutRows(el: Element, cs: CSSStyleDeclaration, stylesOf: StyleLookup): Spec[] {
  const rect = el.getBoundingClientRect();
  const size = layoutSize(el, rect);
  const onBoard = boardPosition(el);
  const isFlex = cs.display.includes("flex");
  const isGrid = cs.display.includes("grid");

  const rows: Spec[] = [
    {
      name: "size",
      value: `${size.width} × ${size.height}`,
      props: ["width", "height"],
      note: sizingIntent(el, cs, stylesOf(el)),
    },
    { name: "on board", value: onBoard?.text ?? "", note: onBoard?.board },
    { name: "padding", value: unless(sidesText(cs, "padding"), "0px"), props: sideProps("padding") },
    { name: "margin", value: unless(sidesText(cs, "margin"), "0px"), props: sideProps("margin") },
  ];
  if (isFlex) {
    const wrap = cs.flexWrap === "nowrap" ? "" : " wrap";
    rows.push(
      { name: "layout", value: `flex ${cs.flexDirection}${wrap}` },
      { name: "align", value: unless(cs.alignItems, "normal") },
      { name: "justify", value: unless(cs.justifyContent, "normal") },
    );
  }
  if (isGrid) {
    rows.push(
      { name: "layout", value: "grid" },
      { name: "columns", value: unless(cs.gridTemplateColumns, "none") },
    );
  }
  if (isFlex || isGrid) {
    rows.push({
      name: "gap",
      value: unless(cs.gap, "normal", "0px"),
      props: ["gap", "row-gap", "column-gap"],
    });
  }
  if (cs.position !== "static") {
    const insets = SIDES.filter((side) => cs.getPropertyValue(side) !== "auto").map(
      (side) => `${side} ${cs.getPropertyValue(side)}`,
    );
    rows.push({ name: "position", value: [cs.position, ...insets].join(" · ") });
  }
  return rows;
}

function shapeRows(cs: CSSStyleDeclaration): Spec[] {
  const borderWidths = sidesText(cs, "border");
  const hasBorder = borderWidths !== "0px";
  const radius = compactSides([
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomRightRadius,
    cs.borderBottomLeftRadius,
  ]);
  return [
    {
      name: "background",
      value: unless(cs.backgroundColor, TRANSPARENT),
      color: true,
      props: ["background-color", "background"],
    },
    {
      name: "gradient",
      value: unless(cs.backgroundImage, "none"),
      props: ["background-image", "background"],
    },
    {
      name: "border",
      value: hasBorder ? `${borderWidths} ${cs.borderTopStyle}` : "",
      props: ["border-width", "border", ...sideProps("border")],
    },
    {
      name: "border color",
      value: hasBorder ? cs.borderTopColor : "",
      color: true,
      props: ["border-color", "border", ...sideProps("border"), "border-top-color"],
    },
    { name: "radius", value: unless(radius, "0px"), props: ["border-radius"] },
    { name: "shadow", value: unless(cs.boxShadow, "none"), props: ["box-shadow"] },
    { name: "opacity", value: unless(cs.opacity, "1"), props: ["opacity"] },
  ];
}

function textRows(el: Element, cs: CSSStyleDeclaration): Spec[] {
  const hasText =
    hasValue(el) ||
    Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim());
  if (!hasText) return [];
  const family = cs.fontFamily.split(",")[0].replaceAll('"', "");
  return [
    {
      name: "font",
      value: `${family} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight}`,
      props: ["font", "font-family", "font-weight", "font-size", "line-height"],
    },
    { name: "color", value: cs.color, color: true, props: ["color"] },
    { name: "spacing", value: unless(cs.letterSpacing, "normal", "0px"), props: ["letter-spacing"] },
    { name: "transform", value: unless(cs.textTransform, "none") },
    { name: "align", value: unless(cs.textAlign, "start", "left") },
    { name: "decoration", value: unless(cs.textDecorationLine, "none") },
  ];
}

function iconRows(el: Element, cs: CSSStyleDeclaration): Spec[] {
  // Not `instanceof SVGElement`: that is false for the elements of a frame.
  if (!("ownerSVGElement" in el)) return [];
  return [
    { name: "fill", value: unless(cs.fill, "none"), color: true, props: ["fill", "color"] },
    { name: "stroke", value: unless(cs.stroke, "none"), color: true, props: ["stroke", "color"] },
    {
      name: "stroke width",
      value: cs.stroke === "none" ? "" : cs.strokeWidth,
      props: ["stroke-width"],
    },
  ];
}

function motionRows(cs: CSSStyleDeclaration): Spec[] {
  return motionItems(cs).map((item) => ({
    name: item.property,
    value: `${item.duration} ${item.easing}`,
  }));
}

export function specSections(
  el: Element,
  cs: CSSStyleDeclaration,
  stylesOf: StyleLookup,
): SpecSection[] {
  return [
    { label: "Layout", rows: layoutRows(el, cs, stylesOf) },
    { label: "Shape", rows: shapeRows(cs) },
    { label: "Text", rows: textRows(el, cs) },
    { label: "Icon", rows: iconRows(el, cs) },
    { label: "Motion", rows: motionRows(cs) },
  ];
}

export interface SpecDifference {
  name: string;
  /** Undefined when that element has no such spec. */
  before?: Spec;
  after?: Spec;
}

/** The specs that differ between a baseline element's sections and another's. */
export function compareSpecs(
  base: SpecSection[],
  other: SpecSection[],
): { differences: SpecDifference[]; identical: number } {
  const flatten = (sections: SpecSection[]) =>
    new Map<string, Spec>(
      sections.flatMap((section) =>
        section.rows.map((spec): [string, Spec] => [`${section.label}/${spec.name}`, spec]),
      ),
    );
  const before = flatten(base);
  const after = flatten(other);
  const keys = [...new Set([...before.keys(), ...after.keys()])]
    // Two elements are never in the same place.
    .filter((key) => !key.endsWith("/on board"))
    .filter((key) => before.get(key)?.value || after.get(key)?.value);
  const differs = (key: string) => (before.get(key)?.value ?? "") !== (after.get(key)?.value ?? "");
  const differences = keys.filter(differs).map((key) => ({
    name: key.split("/")[1],
    before: before.get(key),
    after: after.get(key),
  }));
  return { differences, identical: keys.length - differences.length };
}
