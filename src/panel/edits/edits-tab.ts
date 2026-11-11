/**
 * The Edits tab: every edit the user made to this page, on any element.
 *
 * Each edited element lists its values as before → after, with a reset per
 * line; a click on the element's name pins it. The bar above undoes and
 * redoes, shows the page without the edits, and copies the whole list as a
 * text a coding agent can apply in the source (edits/handoff.ts).
 *
 * Saved edits are not put back on a page by themselves. When the page loads
 * with edits saved on an earlier visit, a bar slides in under the tabs and
 * says how many, on every tab, with a button that applies them and one that
 * discards them. It stays away while the user looks at the original page.
 *
 * The top of the tab holds a note for the pinned element: an instruction in
 * plain words, which travels with the copied edits. The list needs no pinned
 * element, so the tab also shows while the panel is open with nothing pinned.
 */
import { h } from "../../dom";
import type { ElementEdits } from "../../edits/edit-list";
import { listEdits } from "../../edits/edit-list";
import { findPinnedElement, rerender } from "../../selection";
import { type Tab, tabBody } from "../tab";
import { mountEditBar, updateEditBar } from "./edit-bar";
import { createEditedElement } from "./edited-element";
import { createNoteEditor } from "./note-editor";

let panel: HTMLElement;
let body: HTMLElement;

/** Shows the new state everywhere: the page's sizes, the other tabs, this list. */
function refresh(): void {
  // With nothing pinned the panel does not render its tabs; this one still has a list.
  if (findPinnedElement()) rerender();
  else draw(undefined);
}

const countEdits = (edits: ElementEdits[]): number =>
  edits.reduce((sum, item) => sum + item.values.length + (item.note ? 1 : 0), 0);

function createEmpty(): HTMLElement {
  const empty = h("div", "edits-empty");
  empty.append(
    h("b", "", "No edits yet"),
    h(
      "span",
      "hint",
      "Change a value in the All CSS tab, or write a note on an element. Everything you change on this page is listed here, ready to copy.",
    ),
  );
  return empty;
}

function createList(edits: ElementEdits[]): HTMLElement[] {
  const heading = h("div", "heading edits-heading", "On this page");
  heading.appendChild(h("span", "count", String(countEdits(edits))));
  return [heading, ...edits.map((item) => createEditedElement(item, refresh))];
}

function draw(element: Element | undefined): void {
  const scrollTop = body.scrollTop;
  const edits = listEdits();
  body.replaceChildren();
  if (element) body.appendChild(createNoteEditor(element, refresh));
  body.append(...(edits.length ? createList(edits) : [createEmpty()]));
  body.scrollTop = scrollTop;
  updateEditBar(panel, edits);
}

export const editsTab: Tab = {
  mount(element) {
    panel = element;
    body = tabBody(element, "edits");
    mountEditBar(element, refresh);
  },
  render: draw,
  renderUnpinned: () => draw(undefined),
};
