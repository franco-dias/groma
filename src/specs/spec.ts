/**
 * What a row of the Specs tab is, and the small helpers the rows of every
 * section share.
 */
import { SIDES, sidesOf } from "../box-sides";
import type { StyleLookup } from "../page-styles";
import { compactSides } from "./units";

export type Spec = {
  name: string;
  /** Empty when there is nothing to show; such rows are skipped. */
  value: string;
  /** The value is a color: show a swatch and look for tokens with that color. */
  color?: boolean;
  /** CSS properties to look up design tokens for. */
  props?: string[];
  /** Extra information shown beside the value. */
  note?: string;
};

export type SpecSection = { label: string; rows: Spec[] };

/** The element the rows describe, with its computed style and the declarations that apply to it. */
export type SpecSubject = {
  element: Element;
  computedStyle: CSSStyleDeclaration;
  stylesOf: StyleLookup;
};

/** "" when `value` is one of the defaults, so the row is skipped. */
export const unlessDefault = (value: string, ...defaults: string[]): string =>
  defaults.includes(value) ? "" : value;

/** A property and its four per-side longhands. */
export const sideProps = (name: string): string[] => [name, ...SIDES.map((side) => `${name}-${side}`)];

/** "24px" or "12px 16px": the sides of margin, padding or border, shortest form. */
export function sidesText(
  computedStyle: CSSStyleDeclaration,
  property: "margin" | "padding" | "border",
): string {
  const sides = sidesOf(computedStyle, property);
  return compactSides(SIDES.map((side) => `${sides[side]}px`));
}
