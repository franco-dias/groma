/** The sections of the All CSS tab: the user's edits, the read-only groups, the properties and the variables. */
import { h } from "../../dom";
import { options } from "../../options";
import { CSS_GROUPS, DEFAULT_VALUES } from "./css-properties";
import { type CssRow, createReadOnlyRow, elementRows, rectRows, variableRows } from "./css-rows";
import { createEditableRow } from "./editable-row";

/** What the sections are built from: the pinned element, where its edits are saved, and its style. */
export type CssView = {
  element: Element;
  selector: string;
  computedStyle: CSSStyleDeclaration;
  saved: Record<string, string>;
};

const matchesSearch = (row: CssRow): boolean =>
  !options.search || row.name.toLowerCase().includes(options.search);

/** A heading and its rows, or nothing when there are no rows. */
function section(title: string, rows: HTMLElement[]): HTMLElement[] {
  return rows.length ? [h("div", "heading", title), ...rows] : [];
}

export function customSections({ element, selector, saved }: CssView): HTMLElement[] {
  const custom = Object.entries(saved).map(([name, value]) => ({
    name,
    value,
    isOverridden: true,
    isCustom: true,
  }));
  if (!custom.length) return [];
  const rows = custom.map((row) => createEditableRow(row, { element, selector }));
  return [h("div", "heading is-custom", "Your edits"), ...rows, h("div", "divider")];
}

export function readOnlySections(element: Element): HTMLElement[] {
  return [
    ...section("Element", elementRows(element).filter(matchesSearch).map(createReadOnlyRow)),
    ...section("Rect", rectRows(element).filter(matchesSearch).map(createReadOnlyRow)),
  ];
}

function groupRows(props: string[], { computedStyle, saved }: CssView): CssRow[] {
  return props
    .map((name): CssRow => {
      const computed = computedStyle.getPropertyValue(name).trim();
      const isOverridden = saved[name] !== undefined;
      return {
        name,
        value: isOverridden ? saved[name] : computed,
        isDimmed: DEFAULT_VALUES[name] === computed,
        isOverridden,
      };
    })
    .filter((row) => row.value && matchesSearch(row))
    .filter((row) => !(options.hideDefaults && row.isDimmed && !row.isOverridden));
}

export function propertySections(view: CssView): HTMLElement[] {
  const target = { element: view.element, selector: view.selector };
  return CSS_GROUPS.flatMap((group) =>
    section(
      group.label,
      groupRows(group.props, view).map((row) => createEditableRow(row, target)),
    ),
  );
}

export function variableSections({ element, selector, computedStyle }: CssView): HTMLElement[] {
  const rows = variableRows(computedStyle).filter(matchesSearch);
  return section(
    "CSS Variables",
    rows.map((row) => createEditableRow(row, { element, selector })),
  );
}
