/** The rows of the All CSS tab: what they hold, and the read-only groups above the properties. */
import { h } from "../../dom";
import { isColorValue } from "../../specs/colors";

export type CssRow = {
  name: string;
  value: string;
  /** The value is the property's default. */
  isDimmed?: boolean;
  /** The user edited this property. */
  isOverridden?: boolean;
  /** Listed under "Custom styles", the user's edits. */
  isCustom?: boolean;
};

export function elementRows(element: Element): CssRow[] {
  return [
    { name: "tag", value: element.localName },
    { name: "id", value: element.id ? "#" + element.id : "—" },
    { name: "classes", value: Array.from(element.classList).join(" ") || "—" },
  ];
}

const RECT_SIDES = ["top", "right", "bottom", "left", "width", "height"] as const;

export function rectRows(element: Element): CssRow[] {
  const rect = element.getBoundingClientRect();
  return RECT_SIDES.map((name) => ({ name, value: rect[name].toFixed(2) + "px" }));
}

export function variableRows(computedStyle: CSSStyleDeclaration): CssRow[] {
  return Array.from(computedStyle)
    .filter((prop) => prop.startsWith("--"))
    .map((name) => ({ name, value: computedStyle.getPropertyValue(name).trim() }));
}

/** The row's element and the element that holds its value. */
export type RowShell = { rowElement: HTMLElement; valueElement: HTMLElement };

export function createRowShell(row: CssRow): RowShell {
  const rowElement = h("div", "row");
  rowElement.classList.toggle("is-overridden", !!row.isOverridden);
  rowElement.classList.toggle("is-dimmed", !!row.isDimmed && !row.isOverridden);
  rowElement.appendChild(h("span", "name", row.name));
  if (isColorValue(row.value)) {
    rowElement.appendChild(h("span", "swatch")).style.setProperty("--swatch", row.value);
  }
  const valueElement = rowElement.appendChild(h("span", "value", row.value || "—"));
  valueElement.title = row.value;
  return { rowElement, valueElement };
}

export const createReadOnlyRow = (row: CssRow): HTMLElement => createRowShell(row).rowElement;
