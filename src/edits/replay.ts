/**
 * Puts the saved edits back on the page, and takes them off again.
 *
 * They are saved per page and nothing puts them back by itself, because a
 * page that renders late would get some and not others. The panel says how
 * many saved edits this visit has not seen on the page (`missingEdits`), and
 * the user puts them back, or discards them, with one click.
 *
 * What the page had before the first edit is remembered, so the user can look
 * at the page without the edits and bring them back (`showOriginal`).
 */
import { pageDocument } from "../page";
import { allSavedContent, applyContent, restoreContent } from "./content-overrides";
import { allSavedStyles, applyStyle, restoreStyle } from "./style-overrides";
import { areEditsOn, rememberSeen, type SeenEdit, wasSeen } from "./visit-memory";

/** Where to look for elements: inside `root`, for the ones `selector` leads to. */
type Lookup = { root: ParentNode; selector: string };

function forEachMatch({ root, selector }: Lookup, apply: (element: Element) => void): void {
  try {
    root.querySelectorAll(selector).forEach(apply);
  } catch {
    // A selector saved by an older version that this browser rejects.
  }
}

let originalShown = false;

/** True while the user looks at the page without their edits. */
export const isOriginalShown = (): boolean => originalShown;

/** Shows the page as it was before the edits. They stay saved. */
export function showOriginal(): void {
  if (originalShown) return;
  originalShown = true;
  const root = pageDocument();
  Object.entries(allSavedStyles()).forEach(([selector, props = {}]) => {
    forEachMatch({ root, selector }, (element) =>
      Object.keys(props).forEach((prop) => restoreStyle(element, prop)),
    );
  });
  Object.keys(allSavedContent()).forEach((selector) => forEachMatch({ root, selector }, restoreContent));
}

/** Shows the page with the edits again, after `showOriginal`. */
export function showEdits(): void {
  if (!originalShown) return;
  originalShown = false;
  replayOverrides();
}

function replayStyles(root: ParentNode): void {
  Object.entries(allSavedStyles()).forEach(([selector, props = {}]) => {
    Object.entries(props).forEach(([prop, value]) => rememberSeen({ selector, prop, value }));
    forEachMatch({ root, selector }, (element) => {
      Object.entries(props).forEach(([prop, value]) => applyStyle(element, { prop, value }));
    });
  });
}

function replayContent(root: ParentNode): void {
  Object.entries(allSavedContent()).forEach(([selector, content = ""]) => {
    rememberSeen({ selector, prop: undefined, value: content });
    forEachMatch({ root, selector }, (element) => applyContent(element, content));
  });
}

/** Applies every saved edit to the page, or only inside `root`. */
export function replayOverrides(root: ParentNode = pageDocument()): void {
  // A page that re-renders asks for a replay; the user asked for the original.
  if (originalShown) return;
  replayStyles(root);
  replayContent(root);
}

/** A saved edit the page does not show: its property, or undefined for the element's content. */
export type MissingEdit = { selector: string; prop: string | undefined };

/** Whether the page has an element for a selector. */
function isOnPage(selector: string): boolean {
  let onPage = false;
  forEachMatch({ root: pageDocument(), selector }, () => (onPage = true));
  return onPage;
}

/** How many of the elements with saved edits the page has now: more of them later, on a page that draws itself late. */
export function countEditedOnPage(): number {
  const selectors = [...Object.keys(allSavedStyles()), ...Object.keys(allSavedContent())];
  return selectors.filter(isOnPage).length;
}

function isMissing(edit: SeenEdit): boolean {
  return !wasSeen(edit) && isOnPage(edit.selector);
}

/**
 * The edits saved on an earlier visit that this one has not put on the page.
 * An edit whose element is not on the page is left out, since there is
 * nothing to put it on. An edit made during this visit is never one of them,
 * even after the page draws its element again.
 */
export function missingEdits(): MissingEdit[] {
  const styles = Object.entries(allSavedStyles()).flatMap(([selector, props = {}]) =>
    Object.entries(props).map(([prop, value]) => ({ selector, prop, value })),
  );
  const content = Object.entries(allSavedContent()).map(([selector, value = ""]) => ({
    selector,
    prop: undefined,
    value,
  }));
  return [...styles, ...content].filter(isMissing).map(({ selector, prop }) => ({ selector, prop }));
}

/**
 * For a page that is shown anew within one visit (the canvas loads it in a
 * frame, then leaves it): puts the edits back if they were on the page.
 */
export function carryEdits(): void {
  if (areEditsOn()) replayOverrides();
}
