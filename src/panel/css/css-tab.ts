/**
 * The All CSS tab: every computed property of the pinned element.
 *
 * Values are editable. An edit is applied to the page at once, saved, and
 * replayed on the next load (see edits/changes.ts). The top of the tab
 * edits the element's text or form value. The Edits tab lists every edit.
 */
import { getSelector } from "../../edits/selector";
import { savedStyles } from "../../edits/style-overrides";
import { options } from "../../options";
import { syncOutlines } from "../../outlines";
import { rerender, type SelectionChange } from "../../selection";
import { part, type Tab, tabBody } from "../tab";
import { createContentEditor } from "./content-editor";
import { customSections, propertySections, readOnlySections, variableSections } from "./css-sections";
import { takeRowToFocus } from "./editable-row";

let body: HTMLElement;

/** After the browser finishes moving focus to the row that was just replaced. */
function focusMovedRow(): void {
  const row = takeRowToFocus();
  if (!row) return;
  setTimeout(() => body.querySelector<HTMLElement>(`[data-row="${CSS.escape(row)}"]`)?.focus());
}

function renderCss(element: Element, change: SelectionChange): void {
  // A new element starts at the top; an edit keeps the list where it was.
  const scrollTop = change === "pinned" ? 0 : body.scrollTop;
  const selector = getSelector(element);
  const view = { element, selector, computedStyle: getComputedStyle(element), saved: savedStyles(selector) };
  body.replaceChildren(
    createContentEditor(element, selector),
    ...customSections(view),
    ...readOnlySections(element),
    ...propertySections(view),
    ...variableSections(view),
  );
  body.scrollTop = scrollTop;
  focusMovedRow();
}

function mountSearch(panel: HTMLElement): void {
  const search = part<HTMLInputElement>(panel, ".search input");
  const setSearch = (query: string): void => {
    search.value = query;
    options.search = query.toLowerCase().trim();
    rerender();
  };
  search.addEventListener("input", () => setSearch(search.value));
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSearch("");
  });
  part(panel, ".clear").addEventListener("click", () => setSearch(""));
}

function mountOptions(panel: HTMLElement): void {
  part<HTMLInputElement>(panel, '[data-option="hideDefaults"]').addEventListener("change", (event) => {
    // Cast: the event comes from the checkbox this listener is on.
    options.hideDefaults = (event.target as HTMLInputElement).checked;
    rerender();
  });
  part<HTMLInputElement>(panel, '[data-option="highlightPinned"]').addEventListener("change", (event) => {
    // Cast: the event comes from the checkbox this listener is on.
    options.highlightPinned = (event.target as HTMLInputElement).checked;
    syncOutlines();
  });
}

export const cssTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "css");
    mountSearch(panel);
    mountOptions(panel);
  },
  render: renderCss,
};
