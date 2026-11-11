/**
 * What a developer needs to build an element, grouped the way the Specs tab
 * shows it: layout, shape, text, icon, motion.
 */
import { iconRows, motionRows, textRows } from "./content-rows";
import { layoutRows } from "./layout-rows";
import { shapeRows } from "./shape-rows";
import type { SpecSection, SpecSubject } from "./spec";

export function specSections(subject: SpecSubject): SpecSection[] {
  const { element, computedStyle } = subject;
  return [
    { label: "Layout", rows: layoutRows(subject) },
    { label: "Shape", rows: shapeRows(computedStyle) },
    { label: "Text", rows: textRows(element, computedStyle) },
    { label: "Icon", rows: iconRows(element, computedStyle) },
    { label: "Motion", rows: motionRows(computedStyle) },
  ];
}
